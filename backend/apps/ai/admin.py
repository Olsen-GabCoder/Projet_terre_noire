from django.contrib import admin
from .models import AIGeneration


@admin.register(AIGeneration)
class AIGenerationAdmin(admin.ModelAdmin):
    list_display = ['prompt_type', 'user', 'model_used', 'tokens_in', 'tokens_out', 'duration_ms', 'created_at']
    list_filter = ['prompt_type', 'model_used', 'created_at']
    search_fields = ['user__username', 'input_text', 'output_text']
    readonly_fields = ['user', 'prompt_type', 'input_text', 'output_text', 'model_used',
                       'tokens_in', 'tokens_out', 'duration_ms', 'content_type', 'object_id', 'created_at']
    date_hierarchy = 'created_at'
