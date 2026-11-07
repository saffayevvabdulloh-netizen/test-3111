from aiogram import Router, types
from aiogram.filters import Command, CommandStart
from asgiref.sync import sync_to_async
from django.conf import settings

from users import services

router = Router()

_link_and_issue = sync_to_async(services.link_telegram_and_issue_code)
_reset_code = sync_to_async(services.issue_reset_code_for_telegram)

TTL = settings.VERIFICATION_CODE_TTL_MINUTES


@router.message(CommandStart())
async def start_handler(message: types.Message):
    args = (message.text or "").split(maxsplit=1)
    if len(args) < 2:
        await message.answer("Bolajon AI botiga xush kelibsiz! Uni ro'yxatdan o'tish sahifasidagi havola orqali oching.")
        return

    status, code = await _link_and_issue(args[1], message.from_user.id)

    if status == services.TELEGRAM_OK:
        await message.answer(
            "Bolajon AI: Telegram muvaffaqiyatli ulandi ✅\n\n"
            f"Tasdiqlash kodingiz:\n<b>{code}</b>\n\n"
            f"Kod {TTL} daqiqa amal qiladi.",
            parse_mode="HTML",
        )
    elif status == services.TELEGRAM_ALREADY_VERIFIED:
        await message.answer("Bu hisob allaqachon tasdiqlangan. Kirishingiz mumkin ✅")
    elif status == services.TELEGRAM_TAKEN:
        await message.answer("Bu Telegram boshqa hisobga ulangan.")
    else:
        await message.answer("Havola yaroqsiz. Ro'yxatdan o'tish sahifasidan yangisini oling.")


@router.message(Command("reset"))
async def reset_handler(message: types.Message):
    code = await _reset_code(message.from_user.id)
    if not code:
        await message.answer("Bu Telegramga ulangan faol hisob yo'q.")
        return
    await message.answer(
        f"Parolni tiklash kodi:\n<b>{code}</b>\n\n{TTL} daqiqa amal qiladi.\n"
        "Uni hech kimga bermang.",
        parse_mode="HTML",
    )
