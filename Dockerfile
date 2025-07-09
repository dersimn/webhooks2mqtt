FROM node:22-alpine as builder

COPY . /node

RUN cd /node && \
	npm install

# ------------------------------------------------------------------------------

FROM node:22-alpine

COPY --from=builder /node /node

ENTRYPOINT [ "node", "/node/index.js" ]
