#!/bin/bash

# GCP Pub/Sub Deployment Script

set -e

echo "🚀 GCP Pub/Sub Deployment Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        echo -e "${RED}ERROR: gcloud CLI not found. Please install it first.${NC}"
        exit 1
    fi
    
    # Check if terraform is installed
    if ! command -v terraform &> /dev/null; then
        echo -e "${RED}ERROR: terraform not found. Please install it first.${NC}"
        exit 1
    fi
    
    # Check if node is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}ERROR: Node.js not found. Please install it first.${NC}"
        exit 1
    fi
    
    # Check if pnpm is installed
    if ! command -v pnpm &> /dev/null; then
        echo -e "${RED}ERROR: pnpm not found. Please install it first (npm install -g pnpm).${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Setup environment
setup_environment() {
    echo -e "${BLUE}Setting up environment...${NC}"
    
    # Install dependencies
    echo "Installing pnpm dependencies..."
    pnpm install
    
    # Build TypeScript
    echo "Building TypeScript..."
    pnpm run build
    
    echo -e "${GREEN}✅ Environment setup completed${NC}"
}

# Deploy infrastructure
deploy_infrastructure() {
    echo -e "${BLUE}Deploying infrastructure with Terraform...${NC}"
    
    cd terraform
    
    # Check if terraform.tfvars exists
    if [[ ! -f "terraform.tfvars" ]]; then
        echo -e "${YELLOW}terraform.tfvars not found. Creating from example...${NC}"
        cp terraform.tfvars.example terraform.tfvars
        echo -e "${YELLOW}Please edit terraform/terraform.tfvars with your specific values before continuing.${NC}"
        echo -e "${YELLOW}Press Enter when ready to continue...${NC}"
        read -r
    fi
    
    # Initialize terraform
    echo "Initializing Terraform..."
    terraform init
    
    # Plan deployment
    echo "Planning deployment..."
    terraform plan -out=tfplan
    
    # Ask for confirmation
    echo -e "${YELLOW}Review the plan above. Do you want to apply? (y/N)${NC}"
    read -r response
    if [[ "$response" != "y" && "$response" != "Y" ]]; then
        echo "Deployment cancelled."
        cd ..
        exit 0
    fi
    
    # Apply changes
    echo "Applying Terraform changes..."
    terraform apply tfplan
    
    # Clean up plan file
    rm -f tfplan
    
    cd ..
    echo -e "${GREEN}✅ Infrastructure deployed successfully${NC}"
}

# Show deployment info
show_deployment_info() {
    echo -e "${BLUE}Deployment Information${NC}"
    echo "====================="
    
    cd terraform
    
    # Get outputs
    echo -e "${BLUE}Terraform Outputs:${NC}"
    terraform output
    
    cd ..
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Start the producer: pnpm run dev:producer"
    echo "2. Start the consumer: pnpm run dev:consumer -- --subscription sub1-pull-unordered"
    echo "3. Test with: curl -X POST -H 'Content-Type: application/json' -d '{\"message\":\"Hello World!\"}' http://localhost:3000/publish"
    echo ""
    echo -e "${BLUE}Available subscriptions:${NC}"
    echo "- sub1-pull-unordered (Pull, unordered messages)"
    echo "- sub2-push-unordered (Push, unordered messages)"
    echo "- sub3-pull-ordered (Pull, ordered messages)"
    echo "- sub4-push-ordered (Push, ordered messages)"
}

# Main execution
main() {
    check_prerequisites
    setup_environment
    deploy_infrastructure
    show_deployment_info
}

# Run main function
main "$@"