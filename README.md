# FStorage - File server
 * On-fly processing (image/video) for web.
 * Storage with compressing.
 * File serving /:storage/:filename
 
 1. Create a repository. Credentials on the client side (token + secret).
 2. Use the token to access the repository and process related files.
 3. Use the secret to restore access to the repository.
 4. Process files on the fly.
 5. File serving.

### Tech
 - Ffmpeg
 - Node
 - Koa
 - Sharp

### Processing
| Command        | Example     | Result
|----------------| ------------|----------
| `w||width`     | w=200       | set width
| `h||height`    | h=200       | set height
| `ar||aspect`   | ar=1.75     | set aspect ratio. Would not work if both width & height provided.
| `f||format`    | f=webm      | transcode to allowed formats: [`jpg`, `jpeg`, `png`, `webp`, `tiff`] []
| `a||adapt`     | a=pad~top   | Fit images by `scale`, `pad`, or `crop` with position param [`left`, `right`, `top`, `bottom`, `center`, `left_top`, `left_bottom`, `right_top`, `right_bottom`]. Fit videos in `pad` with option in [`blur`] and `crop` with position [`left`, `right`, `top`, `bottom`, `center`, `left_top`, `left_bottom`, `right_top`, `right_bottom`].
| `mg||merge`    | mg=Logo~top | Merge with image by url `http://logos/logo.jpg~top` or with text `Logo~top~33~red`. The second param is a position [`left`, `right`, `top`, `bottom`, `center`, `left_top`, `left_bottom`, `right_top`, `right_bottom`] or presize percentage of left-top corner, for example, `80,95`. Default position is a `center`. The other params both are for text mode: the font size and color. Default font size is 33. Default color is black.
|                |             |
| `q||quality`   | q=60        | quality option for images
| `i||improve`   | i=true      | normalizer for images
| `md||metadata` | md=true     | keep metadata for images
|                |             |
| `s||start`     | s=90        | start time for videos
| `l||length`    | l=15        | duration option for videos
|                |             |
| `d||download`  | d=true      | download file

### API - /api/v1
| Endpoint        | HTTP Method | CRUD Method | Result                              |
|-----------------|-------------|-------------|-------------------------------------|
| /new            | POST        | CREATE      | New storage with access credentials |
| /token          | POST        | CREATE      | Create a new storage access token   |    
| /:storage       | POST        | CREATE      | Add (& process) file in the storage |
| /:storage       | GET         | READ        | List of all files in the storage    |
| /:storage/:file | GET         | READ        | Get file statistics                 |
| /:storage       | PUT         | UPDATE      | Update storage with files           |
| /:storage/:file | PUT         | UPDATE      | Delete file from storage            |
| /:storage       | DELETE      | DELETE      | Delete storage with files           |
| /:storage/:file | DELETE      | DELETE      | Delete file from storage            |


### Run the project

##### Setup
1. Fork/Clone this repo
1. Download [Docker](https://docs.docker.com/docker-for-mac/install/) (if necessary)
1. Make sure you are using a Docker version >= 17:

    ```sh
    $ docker -v
    Docker version 17.03.0-ce, build 60ccb22
    ```

##### Build and Run the App
1. Build the image:
  
    ```sh
    $ cd fserver
    $ docker build -t fserver .
    ```
1. Set the Environment variables

    ```sh
    $ export NODE_ENV=development
    ```
1. Run the container:

    ```sh
    $ docker run -it -p 5000:5000 fserver
    ```
1. Go to http://localhost:5000


##### Run tests
1. Set the Environment variable
    ```sh
    $ export NODE_ENV=test
    ```

1. With the apps up, run:

    ```sh
    $ npm run test
    ```
### Roadmap
 - s3 integration
 - facedetection
 - presets