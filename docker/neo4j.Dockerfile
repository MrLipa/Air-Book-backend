FROM neo4j:5.26.8

COPY ./database/erd.cypher erd.cypher
COPY ./docker/init-neo4j.sh init-neo4j.sh

RUN chmod +x init-neo4j.sh

EXPOSE 7474 7473 7687
