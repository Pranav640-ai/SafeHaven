import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const android = path.join(root, 'android');
const appGradle = path.join(android, 'app/build.gradle');
const rootGradle = path.join(android, 'build.gradle');
const manifest = path.join(android, 'app/src/main/AndroidManifest.xml');
for (const f of [appGradle, rootGradle, manifest]) {
  if (!fs.existsSync(f)) throw new Error(`Missing ${path.relative(root,f)}. Run npm run android:init after npm install.`);
}
const patch = (file, transform) => {
  const old = fs.readFileSync(file, 'utf8');
  const changed = transform(old);
  if (old !== changed) fs.writeFileSync(file, changed);
};
patch(rootGradle, x => {
  if (x.includes('kotlin-gradle-plugin')) return x;
  const match = x.match(/classpath\s+["']com\.android\.tools\.build:gradle:[^\n]+/);
  if (!match) throw new Error('Android root Gradle format changed: add org.jetbrains.kotlin:kotlin-gradle-plugin:2.0.21 manually.');
  return x.replace(match[0], `${match[0]}\n        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:2.0.21'`);
});
patch(appGradle, x => {
  if (!x.includes('kotlin-android') && !x.includes('org.jetbrains.kotlin.android')) {
    const match = x.match(/apply plugin:\s*['"]com\.android\.application['"]/);
    if (!match) throw new Error('Android app Gradle format changed: add Kotlin Android plugin manually.');
    x = x.replace(match[0], `${match[0]}\napply plugin: 'kotlin-android'`);
  }
  if (!x.includes('play-services-nearby')) {
    x = x.replace(/dependencies\s*\{/, 'dependencies {\n    implementation "com.google.android.gms:play-services-nearby:19.3.0"');
  }
  if (!x.includes('kotlinOptions')) {
    x = x.replace(/android\s*\{/, match => match + "\n    kotlinOptions { jvmTarget = '21' }");
  }

  if (!x.includes('play-services-nearby')) throw new Error('Cannot locate dependencies in app build.gradle');
  return x;
});
const required = [
  ['android.permission.ACCESS_WIFI_STATE',''],
  ['android.permission.CHANGE_WIFI_STATE',''],
  ['android.permission.BLUETOOTH','android:maxSdkVersion="30"'],
  ['android.permission.BLUETOOTH_ADMIN','android:maxSdkVersion="30"'],
  ['android.permission.ACCESS_COARSE_LOCATION',''], // GPS consent may grant approximate location
  ['android.permission.ACCESS_FINE_LOCATION',''], // needed by opt-in GPS beacon too
  ['android.permission.BLUETOOTH_SCAN',''],
  ['android.permission.BLUETOOTH_CONNECT',''],
  ['android.permission.BLUETOOTH_ADVERTISE',''],
  ['android.permission.NEARBY_WIFI_DEVICES',''],
  ['android.permission.ACCESS_LOCAL_NETWORK',''], // relevant to newer Android targets
];
patch(manifest, xml => {
  // Nearby 19.3.0 checks these normal Wi-Fi permissions on Android 15 too.
  // Repair previous generated manifests as well as fresh projects.
  xml = xml.replace(/<uses-permission\b[^>]*android:name="android.permission.(?:ACCESS|CHANGE)_WIFI_STATE"[^>]*\/>/g,
    element => element.replace(/\s+android:maxSdkVersion="[^"]*"/g, ''));

  for (const [permission, attributes] of required) {
    if (!xml.includes(`android:name="${permission}"`)) {
      const element = `<uses-permission android:name="${permission}" ${attributes} />`;
      xml = xml.replace('<application', `    ${element}\n    <application`);
    }
  }
  return xml;
});
const nativeSrc = path.join(root, 'native/android/com/safehaven/rescuemesh');
const nativeDst = path.join(android, 'app/src/main/java/com/safehaven/rescuemesh');
fs.mkdirSync(nativeDst, { recursive: true });
for (const file of fs.readdirSync(nativeSrc)) {
  if (file.endsWith('.kt')) fs.copyFileSync(path.join(nativeSrc,file), path.join(nativeDst,file));
}
const candidates = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const d of fs.readdirSync(dir,{withFileTypes:true})) {
    const f=path.join(dir,d.name);
    if (d.isDirectory()) walk(f);
    else if (d.name==='MainActivity.java' || d.name==='MainActivity.kt') candidates.push(f);
  }
}
walk(path.join(android,'app/src/main/java'));
const main = candidates.find(f=>!f.includes('rescuemesh'));
if (!main) throw new Error('No MainActivity found: register RescueMeshPlugin manually.');
patch(main, source => {
  if (source.includes('registerPlugin(RescueMeshPlugin')) return source;
  const kotlin = main.endsWith('.kt');
  if (kotlin) {
    source = source.replace(/(package [^\n]+\n)/, '$1\nimport android.os.Bundle\nimport com.safehaven.rescuemesh.RescueMeshPlugin\n');
    source = source.replace(/class MainActivity[^\{]*\{/, x=>`${x}\n    override fun onCreate(savedInstanceState: Bundle?) {\n        registerPlugin(RescueMeshPlugin::class.java)\n        super.onCreate(savedInstanceState)\n    }`);
    return source;
  }
  source = source.replace(/(package [^\n]+;\s*)/, '$1\nimport android.os.Bundle;\nimport com.safehaven.rescuemesh.RescueMeshPlugin;\n');
  source = source.replace(/class MainActivity[^\{]*\{/, x=>`${x}\n    @Override\n    protected void onCreate(Bundle savedInstanceState) {\n        registerPlugin(RescueMeshPlugin.class);\n        super.onCreate(savedInstanceState);\n    }`);
  return source;
});
console.log('RescueMesh Kotlin plugin, Nearby Gradle dependency, permissions and activity registration installed.');

// Native speech is a separate service; it does not depend on a Nearby link.
patch(main, source => {
  if(source.includes('registerPlugin(SafetySpeechPlugin')) return source;
  if(main.endsWith('.kt')) return source.replace('import com.safehaven.rescuemesh.RescueMeshPlugin','import com.safehaven.rescuemesh.RescueMeshPlugin\nimport com.safehaven.rescuemesh.SafetySpeechPlugin').replace('registerPlugin(RescueMeshPlugin::class.java)','registerPlugin(RescueMeshPlugin::class.java)\n        registerPlugin(SafetySpeechPlugin::class.java)');
  return source.replace('import com.safehaven.rescuemesh.RescueMeshPlugin;','import com.safehaven.rescuemesh.RescueMeshPlugin;\nimport com.safehaven.rescuemesh.SafetySpeechPlugin;').replace('registerPlugin(RescueMeshPlugin.class);','registerPlugin(RescueMeshPlugin.class);\n        registerPlugin(SafetySpeechPlugin.class);');
});
patch(manifest, source=>source.includes('android.intent.action.TTS_SERVICE')?source:source.replace('<application','<queries><intent><action android:name="android.intent.action.TTS_SERVICE" /></intent></queries>\n    <application'));

// Keep the launcher icon reproducible when Capacitor recreates the Android project.
fs.cpSync(path.join(root, 'native/resources'), path.join(android, 'app/src/main/res'), { recursive: true });
