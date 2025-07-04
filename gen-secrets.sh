#!/usr/bin/bash
# Descripción
#    Genera los siguientes archivos secretos:
#    - docker/mysql.env
#    - src/.env
#    - src/config/config.json
#
# Uso
#     gen-secrets.sh [IP| default: 127.0.0.1] [PORT|default: 3306] [--test]
#       -- test Genera archivos de configuración de prueba con postfijo .text
#
# Ejemplos de uso
#     - Genera archivos de configuración de prueba (postfijo .test)
#         ./gen-secrets.sh "172.10.0.2" "3306" --test
#
#     - Genera archivos de configuración de prueba (postfijo .test)
#         ./gen-secrets.sh "" "" --test
#
#     - Genera archivos de configuración (sobreescribiendolos si ya existen)
#         ./gen-secrets.sh
#
#     - Genera archivos de configuración (sobreescribiendolos si ya existen)
#         ./gen-secrets.sh 172.10.0.2" "3306"
#
# OS: Arch Linux 6.14.10
#
# Paquetes necesarios:
# - sed
# - python3

# Funciones
# -----------------------------------------------------------------------------
# $1: file
# $2: to_replace
# $3: replace_with
function replace_line {
    python3 -c '
from sys import argv
file,to_replace,replace_with=argv[1:]
with open(file, "r+") as f:
    content = f.read()
    content = content.replace(to_replace, replace_with)
    f.seek(0)
    f.write(content)
' $1 "$2" "$3"
}
# -----------------------------------------------------------------------------

# Recibir host mysql por parámetros (default: 127.0.0.1)
mysql_host="127.0.0.1"
[[ -n $1 ]] && mysql_host="${1}"

# Recibir puerto mysql por parámetros (default: 3306)
mysql_host_port="${mysql_host}:3306";
mysql_port=3306
if [[ -n $2 ]]; then
    mysql_host_port="${mysql_host}:${2}";
    mysql_port=$2
fi

echo "[Info] MySQL host: ${mysql_host_port}"

# Usar un postfijo para generar archivos de prueba
test_files_postfix=""
[[ -n $3 && $3 == "--test" ]] && test_files_postfix=".test";

# Carpetas
docker_folder="./docker/"
src_folder="./src/"

# Archivos sample
sample_env_mysql="${docker_folder}mysql.env.sample"
sample_src_env="${src_folder}.env.sample"
sample_src_config="${src_folder}config/config.json.sample"

# Archivos a crear
env_mysql="${docker_folder}mysql.env${test_files_postfix}"
src_env="${src_folder}.env${test_files_postfix}"
src_config="${src_folder}config/config.json${test_files_postfix}"

# Generación de secrets para mysql
mysql_database=$(< /dev/urandom tr -cd '[:alnum:]' | head -c 15)
mysql_user=$(< /dev/urandom tr -cd '[:alnum:]' | head -c 10)
mysql_password=$(< /dev/urandom tr -cd '[:graph:]' | head -c 60 | tr ';(){}#![]$=\\"`' '-' | tr "'" "@")
mysql_root_password=$(< /dev/urandom tr -cd '[:graph:]' | head -c 60 | tr ';(){}#![]$=\\"`' '-' | tr "'" "@")

# Generación de docker/mysql.env
cp $sample_env_mysql $env_mysql
replace_line $env_mysql "MYSQL_DATABASE=" "MYSQL_DATABASE=${mysql_database}"
replace_line $env_mysql "MYSQL_USER=" "MYSQL_USER=${mysql_user}"
replace_line $env_mysql "MYSQL_PASSWORD=" "MYSQL_PASSWORD=${mysql_password}"
replace_line $env_mysql "MYSQL_ROOT_PASSWORD=" "MYSQL_ROOT_PASSWORD=${mysql_root_password}"

# Generación de src/config/config.json
cp $sample_src_config $src_config

replace_line $src_config "\"username\": \"\"" "\"username\": \"${mysql_user}\""
replace_line $src_config "\"username\": \"\"" "\"username\": \"${mysql_user}\""
replace_line $src_config "\"password\": \"\"" "\"password\": \"${mysql_password}\""
replace_line $src_config "\"password\": \"\"" "\"password\": \"${mysql_password}\""
sed -i "s|\"database\": \"\"|\"database\": \"${mysql_database}\"|g" $src_config
sed -i "s|\"host\": \"\"|\"host\": \"${mysql_host}\"|g" $src_config
sed -i "s|\"port\": \"\"|\"port\": \"${mysql_port}\"|g" $src_config

# Generación de secrets para src/.env
session_secret=$(< /dev/urandom tr -cd '[:graph:]' | head -c 100 | tr -d '\\')
jwt_secret=$(< /dev/urandom tr -cd '[:graph:]' | head -c 100 | tr -d '\\')

# Generación de src/.env
cp $sample_src_env $src_env

sed -i "s|DB_NAME=|DB_NAME=${mysql_database}|g" $src_env
sed -i "s|DB_HOST=|DB_HOST=${mysql_host}|g" $src_env
sed -i "s|DB_PORT=|DB_PORT=${mysql_port}|g" $src_env
replace_line $src_env "SESSION_SECRET=" "SESSION_SECRET=${session_secret}"
replace_line $src_env "JWT_SECRET=" "JWT_SECRET=${jwt_secret}"
replace_line $src_env "DB_USER=" "DB_USER=${mysql_user}"
replace_line $src_env "DB_PASSWORD=" "DB_PASSWORD=${mysql_password}"