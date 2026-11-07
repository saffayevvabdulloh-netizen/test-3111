from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_user_avatar_verificationcode_attempts_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='BotHeartbeat',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(default='telegram', max_length=20, unique=True)),
                ('ok', models.BooleanField(default=False)),
                ('state', models.CharField(default='not_running', max_length=20)),
                ('detail', models.CharField(blank=True, max_length=200)),
                ('username', models.CharField(blank=True, max_length=64)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
