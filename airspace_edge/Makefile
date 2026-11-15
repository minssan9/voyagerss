BIN := airspace-edge

.PHONY: test build build-pi run-sim

test:
	go vet ./... && go test ./...

build:
	go build -o bin/$(BIN) ./cmd/airspace-edge

# Raspberry Pi 5 / 4 (64-bit OS): static binary, no cgo
build-pi:
	GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o bin/$(BIN)-linux-arm64 ./cmd/airspace-edge

run-sim:
	go run ./cmd/airspace-edge --simulate --server $${AIRSPACE_SERVER_URL:-http://localhost:9002}
