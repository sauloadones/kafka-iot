FROM nginx:alpine
# evita conflito com conf default
RUN rm -f /etc/nginx/conf.d/*.conf
COPY ops/edge/default.conf /etc/nginx/conf.d/default.conf