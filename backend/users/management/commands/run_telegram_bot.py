import asyncio

from django.core.management.base import BaseCommand

from users.telegram_bot.bot import start_bot


class Command(BaseCommand):
    help = "Run the Telegram verification bot (use this in production)."

    def handle(self, *args, **options):
        asyncio.run(start_bot())
