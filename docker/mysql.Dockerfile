FROM mysql:9.3.0

COPY ./database/schema.sql /docker-entrypoint-initdb.d/schema.sql
COPY ./database/seed.sql   /docker-entrypoint-initdb.d/seed.sql

EXPOSE 3306
