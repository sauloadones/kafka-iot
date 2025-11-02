FROM nginx:alpine
# evita conflito com a conf default da imagem
RUN rm -f /etc/nginx/conf.d/*.conf
# <<< caminho RELATIVO ao contexto (ops/edge)
COPY default.conf /etc/nginx/conf.d/default.conf
