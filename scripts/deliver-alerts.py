"""Run from the repository root after configuring VAPID in backend/.env.
The production operator must schedule this worker; no delivery occurs on GET.
"""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from backend import app
from backend.push import deliver_pending
if __name__=='__main__':
    print(deliver_pending())
