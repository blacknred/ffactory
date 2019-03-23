FROM nampdn/node-ffmpeg:latest

# # node:latest
# # Install ffmpeg
# RUN echo "deb http://ftp.uk.debian.org/debian jessie-backports main" >> /etc/apt/sources.list && \
#     apt-get update && \
#     apt-get -y install ffmpeg

# set working directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . ./

# add `/usr/src/node_modules/.bin` to $PATH
ENV PATH /usr/src/node_modules/.bin:$PATH
ENV TOKEN_SECRET \x02\xf3\xf7r\t\x9f\xee\xbbu\xb1\xe1\x90\xfe

# install and cache app dependencies
ADD package.json /usr/src/package.json
RUN yarn remove sharp && yarn add sharp
RUN yarn install
#RUN npm install --unsafe-perm=true

EXPOSE 5001

# start app
CMD ["yarn", "start"]

# docker build . -t ffactory
# docker run -p 5001:5001 -it -v ~+:/usr/src/app ffactory