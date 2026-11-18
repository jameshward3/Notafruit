"""
ClerkOS Django settings.

All deployment-specific values come from environment variables so the same
image runs on any municipal server. See .env.example at the repository root.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def env(key: str, default=None):
    return os.environ.get(key, default)


def env_bool(key: str, default: bool = False) -> bool:
    return str(env(key, str(default))).strip().lower() in ("1", "true", "yes", "on")


SECRET_KEY = env("CLERKOS_SECRET_KEY", "dev-only-insecure-key-change-me")
DEBUG = env_bool("CLERKOS_DEBUG", False)

ALLOWED_HOSTS = [h.strip() for h in env("CLERKOS_ALLOWED_HOSTS", "clerkos.local,localhost,127.0.0.1").split(",") if h.strip()]
CSRF_TRUSTED_ORIGINS = [o.strip() for o in env("CLERKOS_CSRF_TRUSTED_ORIGINS", "https://clerkos.local").split(",") if o.strip()]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres" if env("CLERKOS_DB", "postgres") == "postgres" else "django.contrib.humanize",
    "rest_framework",
    "django_filters",
    # ClerkOS apps
    "apps.accounts",
    "apps.audit",
    "apps.core",
    "apps.records",
    "apps.meetings",
    "apps.legislation",
    "apps.opra",
    "apps.notices",
    "apps.licensing",
    "apps.boards",
    "apps.workflow",
    "apps.compliance",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.audit.middleware.AuditContextMiddleware",
    "apps.accounts.middleware.SessionActivityMiddleware",
]

ROOT_URLCONF = "clerkos.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "clerkos.wsgi.application"
ASGI_APPLICATION = "clerkos.asgi.application"

# --- Database -------------------------------------------------------------
# PostgreSQL in production; CLERKOS_DB=sqlite gives a zero-dependency dev/test
# database so the suite can run without a running Postgres.
if env("CLERKOS_DB", "postgres") == "sqlite":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "clerkos-dev.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("POSTGRES_DB", "clerkos"),
            "USER": env("POSTGRES_USER", "clerkos"),
            "PASSWORD": env("POSTGRES_PASSWORD", ""),
            "HOST": env("POSTGRES_HOST", "db"),
            "PORT": env("POSTGRES_PORT", "5432"),
            "CONN_MAX_AGE": int(env("CLERKOS_CONN_MAX_AGE", "60")),
        }
    }
    # Hosted demo (e.g. a shared managed Postgres): TLS and a dedicated schema.
    _db_options = {}
    if env("POSTGRES_SSLMODE"):
        _db_options["sslmode"] = env("POSTGRES_SSLMODE")
    if env("POSTGRES_SCHEMA"):
        _db_options["options"] = f"-c search_path={env('POSTGRES_SCHEMA')}"
    if _db_options:
        DATABASES["default"]["OPTIONS"] = _db_options

AUTH_USER_MODEL = "accounts.User"

# --- Password policy (NIST 800-63B aligned, configurable) ------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": int(env("CLERKOS_PASSWORD_MIN_LENGTH", "12"))},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Account lockout
CLERKOS_LOCKOUT_THRESHOLD = int(env("CLERKOS_LOCKOUT_THRESHOLD", "5"))
CLERKOS_LOCKOUT_MINUTES = int(env("CLERKOS_LOCKOUT_MINUTES", "15"))

# --- Sessions / security ---------------------------------------------------
SESSION_ENGINE = "django.contrib.sessions.backends.db"
SESSION_COOKIE_AGE = int(env("CLERKOS_SESSION_TIMEOUT_MINUTES", "30")) * 60
SESSION_SAVE_EVERY_REQUEST = True  # sliding inactivity timeout
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"
    X_FRAME_OPTIONS = "DENY"

# --- DRF -------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"]
    if not DEBUG
    else [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}

# --- File storage ----------------------------------------------------------
# Documents live on an encrypted local volume (LUKS/BitLocker at the OS layer)
# or MinIO. Never a public cloud bucket.
MEDIA_ROOT = Path(env("CLERKOS_DOCUMENT_ROOT", str(BASE_DIR / "data" / "documents")))
MEDIA_URL = "/protected-media/"  # served only via authenticated download views

STATIC_URL = "/static/"
STATIC_ROOT = Path(env("CLERKOS_STATIC_ROOT", str(BASE_DIR / "staticfiles")))

FILE_UPLOAD_MAX_MEMORY_SIZE = 25 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = 110 * 1024 * 1024

# Allow-list of upload types; everything else is rejected at the API layer.
CLERKOS_ALLOWED_UPLOAD_EXTENSIONS = [
    e.strip().lower()
    for e in env(
        "CLERKOS_ALLOWED_UPLOAD_EXTENSIONS",
        ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.png,.jpg,.jpeg,.tif,.tiff,.zip,.msg,.eml",
    ).split(",")
]
CLERKOS_MAX_UPLOAD_MB = int(env("CLERKOS_MAX_UPLOAD_MB", "100"))
# Optional command hook, e.g. "clamdscan --no-summary {path}"
CLERKOS_ANTIVIRUS_COMMAND = env("CLERKOS_ANTIVIRUS_COMMAND", "")

# --- Celery ----------------------------------------------------------------
CELERY_BROKER_URL = env("CLERKOS_REDIS_URL", "redis://redis:6379/0")
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_TASK_ALWAYS_EAGER = env_bool("CLERKOS_CELERY_EAGER", False)

# --- Email (local relay; on-prem SMTP) --------------------------------------
EMAIL_BACKEND = env("CLERKOS_EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = env("CLERKOS_SMTP_HOST", "localhost")
EMAIL_PORT = int(env("CLERKOS_SMTP_PORT", "25"))
DEFAULT_FROM_EMAIL = env("CLERKOS_FROM_EMAIL", "clerkos@clerkos.local")

# --- Logging: structured JSON to stdout + DB audit table --------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "format": '{"ts":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":"%(message)s"}',
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "json"},
    },
    "root": {"handlers": ["console"], "level": env("CLERKOS_LOG_LEVEL", "INFO")},
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = env("CLERKOS_TIMEZONE", "America/New_York")
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
