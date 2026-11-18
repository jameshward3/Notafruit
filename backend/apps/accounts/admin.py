from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Department, LoginEvent, Permission, Role, User, UserSession

admin.site.register(User, UserAdmin)
admin.site.register([Department, Permission, Role, UserSession, LoginEvent])
