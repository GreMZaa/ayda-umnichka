FROM alpine:latest

ARG PB_VERSION=0.40.5
RUN apk add --no-cache \
    unzip \
    ca-certificates \
    wget

WORKDIR /pb

# Download official PocketBase linux amd64
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip -O /tmp/pb.zip \
    && unzip /tmp/pb.zip -d /pb/ \
    && rm /tmp/pb.zip \
    && chmod +x /pb/pocketbase

# Copy localized Russian admin UI and hooks
COPY pb_public /pb/pb_public
COPY pb_hooks /pb/pb_hooks

VOLUME /pb/pb_data

EXPOSE 8080

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080", "--dir=/pb/pb_data", "--publicDir=/pb/pb_public"]
