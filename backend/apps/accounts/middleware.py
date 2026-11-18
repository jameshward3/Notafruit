from django.contrib.auth import logout
from django.http import JsonResponse
from django.utils import timezone

from .models import UserSession


class SessionActivityMiddleware:
    """
    Keeps the UserSession row in step with each request: refreshes
    last_activity (powers the active-user list) and enforces admin
    revocation and temporary-access expiry mid-session.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, "user", None)
        if user is not None and user.is_authenticated:
            if user.access_expired or not user.is_active:
                logout(request)
                return JsonResponse({"detail": "Account access has expired."}, status=401)
            key = request.session.session_key
            if key:
                tracked = UserSession.objects.filter(session_key=key).first()
                if tracked is not None:
                    if tracked.is_revoked:
                        logout(request)
                        return JsonResponse({"detail": "Session revoked by an administrator."}, status=401)
                    UserSession.objects.filter(pk=tracked.pk).update(last_activity=timezone.now())
        return self.get_response(request)
