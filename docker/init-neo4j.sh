#!/bin/bash

echo "Setting initial password..."
neo4j-admin dbms set-initial-password Admin123

/var/lib/neo4j/bin/neo4j start

sleep 10

bin/cypher-shell -u neo4j -p Admin123 < erd.cypher

tail -f /var/lib/neo4j/logs/neo4j.log
