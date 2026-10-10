"""Prepare local publisher/push keys without printing or committing secrets.
Run from the repository root. These keys belong to SafeHaven, not an authority.
"""
import base64
import secrets
from pathlib import Path
from dotenv import dotenv_values
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519,ec
root=Path(__file__).resolve().parents[1]
env=root/'backend/.env'
values=dotenv_values(env)
updates={}
if not values.get('SAFETY_ADMIN_TOKEN'):updates['SAFETY_ADMIN_TOKEN']=secrets.token_urlsafe(32)
if not values.get('ALERT_SIGNING_KEY'):
    key=ed25519.Ed25519PrivateKey.generate()
    updates['ALERT_SIGNING_KEY']=base64.b64encode(key.private_bytes(serialization.Encoding.Raw,serialization.PrivateFormat.Raw,serialization.NoEncryption())).decode()
else:key=ed25519.Ed25519PrivateKey.from_private_bytes(base64.b64decode(values['ALERT_SIGNING_KEY']))
if not values.get('VAPID_PRIVATE_KEY'):
    private=ec.generate_private_key(ec.SECP256R1())
    path=root/'backend/data/vapid-private.pem';path.parent.mkdir(parents=True,exist_ok=True)
    path.write_bytes(private.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.TraditionalOpenSSL,serialization.NoEncryption()))
    updates['VAPID_PRIVATE_KEY']='backend/data/vapid-private.pem'
    updates['VAPID_PUBLIC_KEY']=base64.urlsafe_b64encode(private.public_key().public_bytes(serialization.Encoding.X962,serialization.PublicFormat.UncompressedPoint)).decode().rstrip('=')
if not values.get('VAPID_SUBJECT'):updates['VAPID_SUBJECT']='https://github.com/Pranav640-ai/SafeHaven'
if updates:
    with env.open('a',encoding='utf-8') as f:f.write('\n# Local SafeHaven publisher configuration\n'+''.join(f'{k}={v}\n' for k,v in updates.items()))
public=base64.b64encode(key.public_key().public_bytes(serialization.Encoding.Raw,serialization.PublicFormat.Raw)).decode()
frontend=root/'.env.production'
existing=dotenv_values(frontend)
if existing.get('VITE_ALERT_PUBLIC_KEY') and existing['VITE_ALERT_PUBLIC_KEY']!=public:
    raise SystemExit('The frontend already pins a different publisher. Review the rotation before changing it.')
if not existing.get('VITE_ALERT_PUBLIC_KEY'):
    with frontend.open('a',encoding='utf-8') as f:f.write('\nVITE_ALERT_PUBLIC_KEY='+public+'\n')
print('Prepared local publisher and push keys. Private configuration stays in backend/.env and backend/data; the public pin is in .env.production. No notifications were sent.')
