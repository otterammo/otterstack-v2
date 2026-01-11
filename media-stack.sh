#!/bin/bash

# Media Stack Management Script
# Usage: ./media-stack.sh [start|stop|restart|status|logs]

# Function to get all available services dynamically
get_services() {
    # Get services from all docker-compose files
    docker compose config --services 2>/dev/null | sort | tr '\n' ' '
}

case "$1" in
    start)
        echo "Starting media stack..."
        docker compose up -d
        ;;
    stop)
        echo "Stopping media stack..."
        docker compose down
        ;;
    restart)
        echo "Restarting media stack..."
        docker compose down
        docker compose up -d
        ;;
    status)
        echo "Media stack status:"
        docker compose ps
        ;;
    logs)
        if [ -n "$2" ]; then
            # Validate that the service exists
            services=$(get_services)
            if echo "$services" | grep -q "\b$2\b"; then
                docker compose logs -f "$2"
            else
                echo "Error: Service '$2' not found."
                echo "Available services: $services"
                exit 1
            fi
        else
            docker compose logs -f
        fi
        ;;
    test)
        echo "Running smoke tests..."
        ./test-stack.sh "$@"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs [service]|test}"
        echo ""
        echo "Services available:"
        services=$(get_services)
        if [ -n "$services" ]; then
            for service in $services; do
                echo "  - $service"
            done
        else
            echo "  No services found. Make sure docker-compose files are properly configured."
        fi
        echo ""
        echo "Examples:"
        echo "  $0 start          # Start all services"
        echo "  $0 logs jellyfin  # Show logs for jellyfin"
        echo "  $0 status         # Show status of all services"
        echo "  $0 test           # Run smoke tests"
        exit 1
        ;;
esac
