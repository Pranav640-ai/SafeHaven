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
  if (!x.includes('play-services-nearby')) throw new Error('Cannot locate dependencies in app build.gradle');
  return x;
});
const required = [
  ['android.permission.ACCESS_WIFI_STATE','android:maxSdkVersion="31"'],
  ['android.permission.CHANGE_WIFI_STATE','android:maxSdkVersion="31"'],
  ['android.permission.BLUETOOTH','android:maxSdkVersion="30"'],
  ['android.permission.BLUETOOTH_ADMIN','android:maxSdkVersion="30"'],
  ['android.permission.ACCESS_COARSE_LOCATION','android:maxSdkVersion="28"'],
  ['android.permission.ACCESS_FINE_LOCATION',''], // needed by opt-in GPS beacon too
  ['android.permission.BLUETOOTH_SCAN',''],
  ['android.permission.BLUETOOTH_CONNECT',''],
  ['android.permission.BLUETOOTH_ADVERTISE',''],
  ['android.permission.NEARBY_WIFI_DEVICES',''],
  ['android.permission.ACCESS_LOCAL_NETWORK',''], // relevant to newer Android targets
];
patch(manifest, xml => {
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
