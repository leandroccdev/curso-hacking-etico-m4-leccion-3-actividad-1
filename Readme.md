### Guía para el agente revisor
El estudiante asume conocimientos básicos en Linux para seguir la presente guía.

#### Inicialización de la aplicación
El aplicativo debe tener ciertas configuraciones antes de ser candidato a levantamiento de servicios y servidor de desarrollo\producción.
- Generación de secretos y archivos de configuración `./gen-secrets.sh "IP MYSQL" "PUERTO MYSQL"`

```
user@machine:~.../app/docker$ ./gen-secrets.sh "127.0.0.1" "3306"
```

Los siguientes archivos serán generados (sobreescribiendo a los originales si ya existían):
- `src/config/config.json`
- `src/.env`
- `docker/mysql.env`

Para testear la configuración se puede usar el parámetro `--test` al final, esto generará los siguientes archivos (para efectos demostrativos):
- `src/config/config.json.test`
- `src/.env.test`
- `docker/mysql.env.test`

Luego para eliminar dichos archivos el agente puede ejecutar el siguiente comando desde el directorio root del proyecto:

```
user@machine:~.../app/docker$ find . -type f -name '*.test' -exec rm {} \;
```

#### Cheatsheet para docker compose
- https://devhints.io/docker-compose

#### Docker
La carpeta `docker/` contiene los servicios a inicializar para que funcione el aplicativo.
- `cd docker` cambia el directorio actual a la carpeta deseada.

#### ¿Cómo se que CPU tiene mi máquina?

`lscpu | grep 'Model name'`

```
user@machine:~.../app/docker$
Model name:                              Intel(R) Core(TM) i3-8145U CPU @ 2.10GHz
```

#### Iniciar servicios docker (Arch Linux)
El agente revisor deberá iniciar kvm de acuerdo a su arquitectura de CPU.
- Iniciar kvm_amd: `sudo modprobe kvm_amd`
- Iniciar kvm_intel: `sudo modprobe kvm_intel`
- Iniciar docker: `systemctl --user start docker-desktop`
- Iniciar servicios: `docker compose -p 'flcanellas' up -d`

#### Detener servicios docker (Arch Linux)
El agente revisor deberá eliminar el modulo kvm de acuerdo a su arquitectura de CPU.
- Detener servicios: `docker compose stop`
- Eliminar kvm_intel: `sudo modprobe -r kvm_intel`
- Eliminar kvm_amd: `sudo modprobe -r kvm_amd`

#### Reiniciar servicios docker (Arch Linux)
- Iniciar servicios: `docker compose start`

#### Eliminar servicios docker (Arch Linux)
- `docker compose -p 'flcanellas_m4_leccion3' down -v`: elimina los servicios y sus volúmenes.
- `docker compose -p 'flcanellas_m4_leccion3' down`: elimina solo servicios.
- `docker network prune`: elimina las redes no utilizadas en docker.
- `docker system prune`: elimina contenedores detenidos, redes no usadas y caché de construcción (no solo relacionados al proyecto actual).

Luego del network prune se debería tener algo similar a esto:

```
user@machine:~.../app/docker$ docker network ls
NETWORK ID     NAME      DRIVER    SCOPE
30e5ad8b1713   bridge    bridge    local
2d1e1a6305a1   host      host      local
57c9c9bc5d69   none      null      local
```

`docker ps -a` debería mostrar los contenedores:

```
docker ps -a
CONTAINER ID   IMAGE         COMMAND                  CREATED          STATUS                        PORTS     NAMES
2a7c5661c6b9   mysql:9.3.0   "docker-entrypoint.s…"   13 minutes ago   Exited (128) 13 minutes ago             app-db
```

Al igual que `docker compose ls -a`

```
NAME                STATUS              CONFIG FILES
flcanellas         exited(1)           .../app/docker/docker-compose.yml
```

#### Problemas experimentados

##### Docker compose down -v no funciona
Ésto sucede porque no se usó `docker compose - p 'flcanellas' [acción]`.
- `docker compose -p 'flcanellas_m4_leccion3' down -v`: debería eliminar los servicios del proyecto actual.

Una vez que docker compose **no muestre el proyecto actual** ya se podrá proceder a levantar servicios otra vez con `docker compose -p 'flcanellas_m4_leccion3' up -d`.

##### ¿Debería eliminar imágenes?
El estudiante no lo recomienda, aunque si el agente revisor así lo requiere, primero debería inspeccionar las imágenes actuales:

```
user@machine:~.../app/docker$ docker image ls
REPOSITORY   TAG       IMAGE ID       CREATED        SIZE
mysql        9.3.0     9a084cc73e71   2 months ago   1.17GB
```

Para proceder con la eliminación de una imagen en puntual, use el `IMAGE ID` de la siguiente forma:

`docker image rm [IMAGE ID]`

Luego verifique la eliminación:

```
user@machine:~.../app/docker$ docker image ls
REPOSITORY   TAG       IMAGE ID       CREATED        SIZE
```

### Base de datos

#### Inicialización
Para inicializar la base de datos se debe realizar lo siguiente:
- Posicionarse en la carpeta `app/src/`
- Cargar las migraciones del proyecto: `npx sequelize-cli db:migrate`
- Cargar las semillas del proyecto: `npx sequelize-cli db:seed:all`

Se cargará el usuario `admin/2025#he048`.

#### Deshacer la inicialización
Para deshacer la inicialización se debe realizar lo siguiente:
- Remover las semillas del proyecto: `npx sequelize-cli db:seed:undo`
- Remover las migraciones del proyecto: `npx sequelize-cli db:migrate:undo`

**Nota:** La tabla SequelizeMeta permanecerá.

##### Borrar la tabla SequelizeMeta
Correr directamente desde MySQL Workbench/phpmyadmin/otro DBMS: `DROP TABLE SequelizeMeta;`

##### Problemáticas
En algunos casos al correr sequelize-cli saldrá el siguiente error:
`ERROR: Connection lost: The server closed the connection`

En tal caso habrá que esperar unos segundos para darle tiempo a los servicios de terminar su inicialización antes de intentar usar sequelize-cli nuevamente.

#### Iniciar APP
Inicia la aplicación en modo productivo: `npm start`

#### Iniciar dev server
Inicia la aplicación en modo desarrollo: `npm run dev`

#### Tailwindcss

##### Carga dinámica de colores en widgets
No ejecutar `npm run tailwind:build` ni `npm run tailwind:watch`.
Los colores de los widgets se cargan de manera dinámica, desde nodejs tailwindcss no podrá leer los colores que aún no existen en las vistas de pugjs. **Debido a ésto, el estudiante optó por incluir el componente desde el CDN oficial.**

#### Cambiar el color de los widgets
Para cambiar el color de los widgets se debe modificar la propiedad la propiedad `TW_WIDGET_COLOR` del archivo `src/.env`, y luego reiniciar el servidor node.