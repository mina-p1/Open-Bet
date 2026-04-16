import sys
from unittest.mock import MagicMock


# Firebase admin:
# app.py does: import firebase_admin
#   from firebase_admin import credentials, firestore

_firebase_mock = MagicMock()
_firebase_mock._apps = {}

_firestore_mock = MagicMock()
_db_mock        = MagicMock()
_firestore_mock.client.return_value = _db_mock
_firestore_mock.SERVER_TIMESTAMP    = "SERVER_TIMESTAMP"
_firestore_mock.Query.DESCENDING    = "DESCENDING"

sys.modules["firebase_admin"]             = _firebase_mock
sys.modules["firebase_admin.credentials"] = MagicMock()
sys.modules["firebase_admin.firestore"]   = _firestore_mock



#Google OAUth:
# app.py does: from google.oauth2 import id_token
# google.auth.transport import requests as google_requests

_google_mock          = MagicMock()
_google_oauth2_mock   = MagicMock()
_google_auth_mock     = MagicMock()
_google_transport_mock = MagicMock()

sys.modules["google"]                        = _google_mock
sys.modules["google.oauth2"]                 = _google_oauth2_mock
sys.modules["google.oauth2.id_token"]        = MagicMock()
sys.modules["google.auth"]                   = _google_auth_mock
sys.modules["google.auth.transport"]         = _google_transport_mock
sys.modules["google.auth.transport.requests"] = MagicMock()
