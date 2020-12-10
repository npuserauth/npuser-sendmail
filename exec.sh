#!/usr/bin/env bash

function usage() {
    echo "Usage $0 container-name [exec | stop | rm | log] "
    cat <<-____HERE
    This script will find and execute interactive shell on the given container-name
____HERE
    exit 1
}

: "${cmd:=$2}"
: "${name:=$1}"

if [[ -z "${cmd}" ]]; then
    usage
    exit
fi

if [[ -z "${name}" ]]; then
    usage
    exit
fi

c_id=$(docker ps | grep ${name} | awk '{print $1;}')

echo ${cmd}: ${name} - $c_id

if [[ -z "${c_id}" ]]; then
    echo 'Container not found'
    exit
fi

if [[ "${cmd}" == "exec" ]]; then
  echo 'exec ${c_id}'
  docker exec -it $c_id /bin/bash
fi

if [[ "${cmd}" == "sh" ]]; then
  echo 'exec ${c_id}'
  docker exec -it $c_id /bin/sh
fi

if [[ "${cmd}" == "stop" ]]; then
  echo 'stop $c_id'
  docker stop $c_id
fi

if [[ "${cmd}" == "rm" ]]; then
  echo 'remove ${c_id}'
  docker rm $c_id
fi

if [[ "${cmd}" == "log" ]]; then
  echo 'logs ${c_id}'
  docker logs -f $c_id
fi
