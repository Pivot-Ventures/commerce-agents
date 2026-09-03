# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""The production image: one origin, fixtures by default, no baked secrets."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEPLOY = ROOT / "deploy"
DOCKERFILE = ROOT / "Dockerfile"


def test_nginx_template_routes_the_four_public_paths():
    text = (DEPLOY / "nginx.conf.template").read_text(encoding="utf-8")
    for needle in (
        "location /api/",
        "location /merchant",
        "location /admin",
        "location /",
        "listen ${PORT}",
        "proxy_buffering off",
        "Host 127.0.0.1",
    ):
        assert needle in text, needle
    assert "listen 80;" not in text.replace("listen ${PORT}", "")


def test_dockerfile_is_fixtures_only_and_takes_the_key_at_runtime():
    text = DOCKERFILE.read_text(encoding="utf-8")
    assert "ANTHROPIC_API_KEY" in text
    assert "ENV ANTHROPIC_API_KEY" not in text
    assert 'ENV EQUIPACCESS_API_BASE=""' in text
    assert "docker run -p 80:80 -e ANTHROPIC_API_KEY=" in text
    assert "NEXT_BASE_PATH=/merchant" in text
    assert "NEXT_BASE_PATH=/admin" in text
    assert 'NEXT_PUBLIC_API_URL=""' in text


def test_next_configs_honor_base_path_and_standalone_only_when_set():
    for app in ("storefront-web", "merchant-web", "admin-web"):
        text = (ROOT / app / "next.config.ts").read_text(encoding="utf-8")
        assert "NEXT_BASE_PATH" in text
        assert "assetPrefix" in text
        assert 'NEXT_OUTPUT === "standalone"' in text
        assert "basePath: '/merchant'" not in text
        assert "basePath: '/admin'" not in text


def test_serve_does_not_enable_live_laravel_or_payouts():
    text = (DEPLOY / "serve.py").read_text(encoding="utf-8")
    assert "EQUIPACCESS_API_BASE is not set here" in text
    assert "POST /api/haulage" in text
    assert 'os.environ.get("PORT", "80")' in text
