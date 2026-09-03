# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
#
# One image: storefront /, merchant /merchant, admin /admin, FastAPI /api.
# Build from the repo root. The demo stays on fixtures; pass ANTHROPIC_API_KEY
# at run time for chat. Do not bake secrets into the image.
#
#   docker build -f examples/equipaccess/Dockerfile -t equipaccess .
#   docker run -p 80:80 -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" equipaccess

# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS web
WORKDIR /src/examples
COPY examples/package.json examples/package-lock.json ./
COPY examples/web-shared ./web-shared
COPY examples/retail/storefront-web ./retail/storefront-web
COPY examples/retail/merchant-web ./retail/merchant-web
COPY examples/travel/storefront-web ./travel/storefront-web
COPY examples/travel/merchant-web ./travel/merchant-web
COPY examples/telecom/storefront-web ./telecom/storefront-web
COPY examples/telecom/merchant-web ./telecom/merchant-web
COPY examples/entertainment/storefront-web ./entertainment/storefront-web
COPY examples/entertainment/merchant-web ./entertainment/merchant-web
COPY examples/equipaccess/storefront-web ./equipaccess/storefront-web
COPY examples/equipaccess/merchant-web ./equipaccess/merchant-web
COPY examples/equipaccess/admin-web ./equipaccess/admin-web
RUN npm ci --no-audit --no-fund

# Same-origin /api in the browser. Merchant and admin sit under path prefixes.
ENV NEXT_PUBLIC_API_URL=""
ENV NEXT_OUTPUT=standalone
WORKDIR /src/examples/equipaccess/storefront-web
RUN npx next build
WORKDIR /src/examples/equipaccess/merchant-web
ENV NEXT_BASE_PATH=/merchant
RUN npx next build
WORKDIR /src/examples/equipaccess/admin-web
ENV NEXT_BASE_PATH=/admin
RUN npx next build

FROM python:3.12-slim-bookworm AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /etc/nginx/templates /tmp/nginx

COPY --from=web /usr/local/bin/node /usr/local/bin/node

WORKDIR /app
COPY requirements.txt ./
COPY commerce-common ./commerce-common
COPY shopping-agent ./shopping-agent
COPY merchant-agent ./merchant-agent
RUN pip install --no-cache-dir -r requirements.txt

COPY examples/demo_common ./examples/demo_common
COPY examples/equipaccess/__init__.py ./examples/equipaccess/__init__.py
COPY examples/equipaccess/api ./examples/equipaccess/api
COPY examples/equipaccess/data ./examples/equipaccess/data
COPY examples/equipaccess/deploy ./examples/equipaccess/deploy

COPY --from=web /src/examples/equipaccess/storefront-web/.next/standalone /app/web/storefront
COPY --from=web /src/examples/equipaccess/storefront-web/.next/static /tmp/static/storefront
COPY --from=web /src/examples/equipaccess/merchant-web/.next/standalone /app/web/merchant
COPY --from=web /src/examples/equipaccess/merchant-web/.next/static /tmp/static/merchant
COPY --from=web /src/examples/equipaccess/admin-web/.next/standalone /app/web/admin
COPY --from=web /src/examples/equipaccess/admin-web/.next/static /tmp/static/admin
RUN python examples/equipaccess/deploy/place_static.py

COPY examples/equipaccess/deploy/nginx.conf.template /etc/nginx/templates/equipaccess.conf.template

ENV PYTHONUNBUFFERED=1
ENV PORT=80
# Fixtures unless the operator sets EQUIPACCESS_API_BASE at run time.
ENV EQUIPACCESS_API_BASE=""
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/api/health' % os.environ.get('PORT','80'), timeout=3)"

WORKDIR /app
CMD ["python", "examples/equipaccess/deploy/serve.py"]
