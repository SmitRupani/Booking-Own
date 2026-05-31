FROM postgres:16-alpine

ENV POSTGRES_DB=booking_own
ENV POSTGRES_USER=booking_user
ENV POSTGRES_PASSWORD=booking_password

EXPOSE 5432

VOLUME ["/var/lib/postgresql/data"]
