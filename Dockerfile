FROM node:22 as builder

COPY . /node

RUN cd /node && \
	npm install

# ------------------------------------------------------------------------------

FROM node:22-slim

COPY --from=builder /node /node

ENTRYPOINT [ "node", "/node/index.js" ]
