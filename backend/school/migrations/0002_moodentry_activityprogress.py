import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('school', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='MoodEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('day', models.DateField()),
                ('mood', models.CharField(choices=[('xursand', 'xursand'), ('uyqu', 'uyqu'), ('xafa', 'xafa'), ('jahl', 'jahl'), ('qorq', 'qorq')], max_length=12)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='moods', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-day'],
                'constraints': [models.UniqueConstraint(fields=('student', 'day'), name='uniq_mood_per_day')],
            },
        ),
        migrations.CreateModel(
            name='ActivityProgress',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('activity', models.CharField(max_length=40)),
                ('best_stars', models.PositiveSmallIntegerField(default=0)),
                ('plays', models.PositiveIntegerField(default=0)),
                ('last_mistakes', models.PositiveSmallIntegerField(default=0)),
                ('last_played_at', models.DateTimeField(auto_now=True)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='activity_progress', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['activity'],
                'constraints': [models.UniqueConstraint(fields=('student', 'activity'), name='uniq_activity_progress')],
            },
        ),
    ]
