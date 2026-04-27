FROM ubuntu:24.04

ENV CI=true
ENV DEBIAN_FRONTEND=noninteractive
ENV GCLOUD_PROJECT=demo-local
ENV RELEASE_CHANNEL=docker

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    binutils \
    git \
    gnupg \
    libasound2t64 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnotify4 \
    libnss3 \
    libpango-1.0-0 \
    libsecret-1-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    openjdk-21-jre-headless \
    sudo \
    xvfb \
    xz-utils \
    xdg-utils \
  && install -d -m 0755 /etc/apt/keyrings \
  && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
  && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends nodejs \
  && corepack enable \
  && corepack prepare pnpm@10.33.2 --activate \
  && useradd -m -s /bin/bash runner \
  && echo "runner ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/runner \
  && chmod 0440 /etc/sudoers.d/runner \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
RUN chown runner:runner /workspace
COPY --chown=runner:runner . .

USER runner

CMD ["bash", "scripts/package-linux-docker.sh"]