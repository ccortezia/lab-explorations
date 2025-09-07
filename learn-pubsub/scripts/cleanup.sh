#!/bin/bash

# GCP Pub/Sub Cleanup Script

set -e

echo "🧹 GCP Pub/Sub Cleanup Script"
echo "============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Cleanup infrastructure
cleanup_infrastructure() {
    echo -e "${BLUE}Cleaning up infrastructure with Terraform...${NC}"
    
    cd terraform
    
    # Check if terraform state exists
    if [[ ! -f "terraform.tfstate" ]]; then
        echo -e "${YELLOW}No Terraform state found. Nothing to clean up.${NC}"
        cd ..
        return 0
    fi
    
    # Show what will be destroyed
    echo "Planning destruction..."
    terraform plan -destroy
    
    # Ask for confirmation
    echo -e "${YELLOW}This will destroy all Pub/Sub resources. Are you sure? (y/N)${NC}"
    read -r response
    if [[ "$response" != "y" && "$response" != "Y" ]]; then
        echo "Cleanup cancelled."
        cd ..
        exit 0
    fi
    
    # Destroy resources
    echo "Destroying Terraform resources..."
    terraform destroy -auto-approve
    
    cd ..
    echo -e "${GREEN}✅ Infrastructure cleaned up successfully${NC}"
}

# Cleanup local files
cleanup_local() {
    echo -e "${BLUE}Cleaning up local files...${NC}"
    
    # Remove build artifacts
    if [[ -d "dist" ]]; then
        echo "Removing dist directory..."
        rm -rf dist
    fi
    
    # Remove node_modules if requested
    echo -e "${YELLOW}Do you want to remove node_modules and pnpm store cache? (y/N)${NC}"
    read -r response
    if [[ "$response" == "y" || "$response" == "Y" ]]; then
        echo "Removing node_modules..."
        rm -rf node_modules
        echo "Removing pnpm-lock.yaml..."
        rm -f pnpm-lock.yaml
    fi
    
    # Remove terraform files
    if [[ -d "terraform/.terraform" ]]; then
        echo "Removing terraform cache..."
        rm -rf terraform/.terraform
        rm -f terraform/.terraform.lock.hcl
    fi
    
    # Remove terraform plan files
    rm -f terraform/*.tfplan
    
    echo -e "${GREEN}✅ Local cleanup completed${NC}"
}

# Show cleanup info
show_cleanup_info() {
    echo ""
    echo -e "${GREEN}🎉 Cleanup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}What was cleaned up:${NC}"
    echo "- All GCP Pub/Sub topics and subscriptions"
    echo "- Dead letter topics and subscriptions"
    echo "- Local build artifacts (dist/)"
    echo "- Terraform state and cache files"
    echo ""
    echo -e "${BLUE}To redeploy, run:${NC}"
    echo "./scripts/deploy.sh"
}

# Main execution
main() {
    cleanup_infrastructure
    cleanup_local
    show_cleanup_info
}

# Run main function
main "$@"