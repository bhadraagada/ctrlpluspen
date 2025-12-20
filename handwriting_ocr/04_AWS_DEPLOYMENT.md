# 04 - AWS Deployment Guide

**Complete guide for deploying your Handwriting OCR model to AWS**

---

## 📚 Table of Contents

1. [Prerequisites & AWS Setup](#prerequisites--aws-setup)
2. [Architecture Overview](#architecture-overview)
3. [Option A: Simple EC2 Deployment (MVP)](#option-a-simple-ec2-deployment-mvp)
4. [Option B: ECS with Fargate (Serverless)](#option-b-ecs-with-fargate-serverless)
5. [Option C: ECS with EC2 GPU (Production)](#option-c-ecs-with-ec2-gpu-production)
6. [Infrastructure as Code (Terraform)](#infrastructure-as-code-terraform)
7. [CI/CD Pipeline](#cicd-pipeline-with-github-actions)
8. [Monitoring & Logging](#monitoring--logging)
9. [Security Best Practices](#security-best-practices)
10. [Cost Optimization](#cost-optimization)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites & AWS Setup

### 1. AWS Account Setup

**Create AWS Account:**
1. Go to https://aws.amazon.com
2. Click "Create an AWS Account"
3. Complete registration with email and payment method
4. Verify your identity (phone verification)

**Enable Billing Alerts:**
```bash
# Set up billing alarm to avoid surprises
1. Go to AWS Console → Billing → Billing Preferences
2. Enable "Receive Billing Alerts"
3. Go to CloudWatch → Alarms → Create Alarm
4. Set threshold: $50, $100, $500 (adjust to your budget)
```

### 2. Install AWS CLI

**Windows:**
```powershell
# Download and install AWS CLI
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi

# Verify installation
aws --version
# Should show: aws-cli/2.x.x Python/3.x.x Windows/...
```

**Linux/Mac:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify
aws --version
```

### 3. Configure AWS Credentials

**Create IAM User:**
1. Go to IAM Console → Users → Add User
2. User name: `handwriting-ocr-deploy`
3. Access type: Programmatic access
4. Attach policies:
   - `AmazonEC2FullAccess`
   - `AmazonECS_FullAccess`
   - `AmazonEC2ContainerRegistryFullAccess`
   - `ElasticLoadBalancingFullAccess`
   - `CloudWatchFullAccess`
5. Save Access Key ID and Secret Access Key

**Configure CLI:**
```bash
aws configure
# AWS Access Key ID: <your-access-key>
# AWS Secret Access Key: <your-secret-key>
# Default region name: us-east-1
# Default output format: json

# Test configuration
aws sts get-caller-identity
```

### 4. Local Development Prerequisites

- [ ] Docker installed and running
- [ ] Trained model ready (best.pt from YOLOv8 training)
- [ ] FastAPI application code ready
- [ ] Git repository set up

**Estimated setup time:** 30-60 minutes

---

## Architecture Overview

### High-Level AWS Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud (VPC)                          │
│                                                                   │
│  ┌─────────────┐      ┌──────────────────────────────────────┐ │
│  │   Internet  │─────▶│   Application Load Balancer (ALB)    │ │
│  │   Gateway   │      │   - Port 80/443                       │ │
│  └─────────────┘      │   - Health checks                     │ │
│                        │   - SSL/TLS termination               │ │
│                        └────────────┬─────────────────────────┘ │
│                                     │                             │
│                        ┌────────────▼─────────────────────────┐ │
│                        │      ECS Service (Auto-scaling)       │ │
│                        │   - Desired count: 2                  │ │
│                        │   - Min: 1, Max: 5                    │ │
│                        │   - Target CPU: 70%                   │ │
│                        └────────────┬─────────────────────────┘ │
│                                     │                             │
│              ┌──────────────────────┼──────────────────────┐    │
│              │                      │                      │     │
│         ┌────▼─────┐          ┌────▼─────┐          ┌────▼────┐│
│         │ ECS Task │          │ ECS Task │          │ECS Task ││
│         │          │          │          │          │         ││
│         │  ┌────┐  │          │  ┌────┐  │          │ ┌────┐ ││
│         │  │GPU │  │          │  │GPU │  │          │ │GPU │ ││
│         │  │T4  │  │          │  │T4  │  │          │ │T4  │ ││
│         │  └────┘  │          │  └────┘  │          │ └────┘ ││
│         │   API    │          │   API    │          │  API   ││
│         └──────────┘          └──────────┘          └────────┘│
│                                                                   │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────────┐ │
│  │     ECR     │   │  CloudWatch  │   │    S3 Bucket        │ │
│  │  (Images)   │   │  (Logs/Metrics)│  │  (Model Storage)    │ │
│  └─────────────┘   └──────────────┘   └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Component | Purpose | Cost |
|-----------|---------|------|
| **ECR** | Docker image registry | $0.10/GB/month |
| **ECS** | Container orchestration | Free (pay for EC2/Fargate) |
| **EC2 (g4dn.xlarge)** | GPU compute instances | $0.526/hour (~$380/month) |
| **ALB** | Load balancing & health checks | ~$20/month |
| **CloudWatch** | Monitoring & logging | ~$10/month |
| **S3** | Model storage | ~$2-5/month |
| **VPC** | Network isolation | Free |

**Total Estimated Cost:** $400-600/month (with auto-scaling)

---

## Option A: Simple EC2 Deployment (MVP)

**Best for:** Quick MVP, testing, low traffic (<1000 requests/day)  
**Setup time:** 1-2 hours  
**Cost:** ~$380/month (single g4dn.xlarge 24/7)

### Step 1: Launch EC2 Instance

```bash
# Create security group
aws ec2 create-security-group \
  --group-name handwriting-ocr-sg \
  --description "Security group for handwriting OCR API" \
  --vpc-id <your-vpc-id>

# Add inbound rules
aws ec2 authorize-security-group-ingress \
  --group-id <security-group-id> \
  --protocol tcp --port 22 --cidr 0.0.0.0/0  # SSH (restrict to your IP in production)

aws ec2 authorize-security-group-ingress \
  --group-id <security-group-id> \
  --protocol tcp --port 80 --cidr 0.0.0.0/0  # HTTP

aws ec2 authorize-security-group-ingress \
  --group-id <security-group-id> \
  --protocol tcp --port 443 --cidr 0.0.0.0/0  # HTTPS

aws ec2 authorize-security-group-ingress \
  --group-id <security-group-id> \
  --protocol tcp --port 8000 --cidr 0.0.0.0/0  # FastAPI

# Launch g4dn.xlarge instance with Deep Learning AMI
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \  # Deep Learning AMI (Ubuntu 20.04)
  --instance-type g4dn.xlarge \
  --key-name <your-key-pair> \
  --security-group-ids <security-group-id> \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":100,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=handwriting-ocr-api}]'
```

### Step 2: Connect and Setup Instance

```bash
# SSH into instance
ssh -i <your-key.pem> ubuntu@<instance-public-ip>

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker

# Verify GPU is accessible in Docker
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

### Step 3: Build and Run Docker Container

```bash
# Clone your repository
git clone https://github.com/yourusername/handwriting-ocr.git
cd handwriting-ocr

# Build Docker image
docker build -t handwriting-ocr:latest .

# Run container with GPU
docker run -d \
  --name handwriting-ocr \
  --gpus all \
  -p 8000:8000 \
  -v $(pwd)/models:/app/models \
  --restart unless-stopped \
  handwriting-ocr:latest

# Check logs
docker logs -f handwriting-ocr

# Test API
curl http://localhost:8000/health
```

### Step 4: Allocate Elastic IP (Optional but Recommended)

```bash
# Allocate Elastic IP
aws ec2 allocate-address --domain vpc

# Associate with instance
aws ec2 associate-address \
  --instance-id <instance-id> \
  --allocation-id <allocation-id>
```

### Step 5: Set Up NGINX Reverse Proxy (Optional)

```bash
# Install NGINX
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Configure NGINX
sudo nano /etc/nginx/sites-available/handwriting-ocr

# Add configuration:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeout for long-running OCR requests
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/handwriting-ocr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate (if you have a domain)
sudo certbot --nginx -d your-domain.com
```

### Step 6: Test Deployment

```bash
# Test from your local machine
curl -X POST "http://<elastic-ip>/recognize" \
  -F "image=@test.jpeg" \
  | jq

# Expected response:
{
  "text": "detected handwriting",
  "confidence": 0.89,
  "bounding_boxes": [...]
}
```

**✅ MVP Deployment Complete!**

**Pros:**
- Quick setup (1-2 hours)
- Simple to understand and debug
- Full control over instance

**Cons:**
- No auto-scaling
- Single point of failure
- Manual updates required
- No load balancing

---

## Option B: ECS with Fargate (Serverless)

**Best for:** CPU-only inference, serverless deployment, variable traffic  
**Setup time:** 3-4 hours  
**Cost:** ~$200-400/month (depends on usage)

**⚠️ Note:** Fargate doesn't support GPU. Use this only for CPU-based inference or testing.

### Step 1: Create ECR Repository

```bash
# Create repository
aws ecr create-repository \
  --repository-name handwriting-ocr \
  --region us-east-1

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

### Step 2: Build and Push Docker Image

```bash
# Build for CPU (Fargate compatible)
docker build -t handwriting-ocr:latest -f Dockerfile.cpu .

# Tag image
docker tag handwriting-ocr:latest \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/handwriting-ocr:latest

# Push to ECR
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/handwriting-ocr:latest
```

### Step 3: Create ECS Cluster

```bash
# Create Fargate cluster
aws ecs create-cluster \
  --cluster-name handwriting-ocr-cluster \
  --region us-east-1
```

### Step 4: Create Task Definition

```bash
# Create task-definition.json
cat > task-definition.json << 'EOF'
{
  "family": "handwriting-ocr-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "handwriting-ocr",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/handwriting-ocr:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {
          "name": "DEVICE",
          "value": "cpu"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/handwriting-ocr",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

# Register task definition
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json
```

### Step 5: Create Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name handwriting-ocr-alb \
  --subnets <subnet-1> <subnet-2> \
  --security-groups <security-group-id> \
  --scheme internet-facing \
  --type application

# Create target group
aws elbv2 create-target-group \
  --name handwriting-ocr-tg \
  --protocol HTTP \
  --port 8000 \
  --vpc-id <vpc-id> \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=<target-group-arn>
```

### Step 6: Create ECS Service

```bash
# Create service
aws ecs create-service \
  --cluster handwriting-ocr-cluster \
  --service-name handwriting-ocr-service \
  --task-definition handwriting-ocr-task \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<subnet-1>,<subnet-2>],securityGroups=[<security-group-id>],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=<target-group-arn>,containerName=handwriting-ocr,containerPort=8000"
```

### Step 7: Configure Auto Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/handwriting-ocr-cluster/handwriting-ocr-service \
  --min-capacity 1 \
  --max-capacity 5

# Create scaling policy (CPU-based)
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/handwriting-ocr-cluster/handwriting-ocr-service \
  --policy-name cpu-scaling-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json

# scaling-policy.json:
{
  "TargetValue": 70.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleOutCooldown": 60,
  "ScaleInCooldown": 300
}
```

**✅ Fargate Deployment Complete!**

---

## Option C: ECS with EC2 GPU (Production)

**Best for:** Production deployment with GPU, auto-scaling, high availability  
**Setup time:** 4-6 hours  
**Cost:** ~$500-800/month (2-3 instances with auto-scaling)

This is the **recommended production setup** combining GPU performance with AWS managed services.

### Step 1: Create ECR Repository & Push Image

```bash
# Create repository
aws ecr create-repository \
  --repository-name handwriting-ocr \
  --region us-east-1

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build Docker image with GPU support
docker build -t handwriting-ocr:latest .

# Tag and push
docker tag handwriting-ocr:latest \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/handwriting-ocr:latest

docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/handwriting-ocr:latest
```

### Step 2: Create ECS Cluster with EC2

```bash
# Create ECS cluster
aws ecs create-cluster \
  --cluster-name handwriting-ocr-cluster \
  --region us-east-1 \
  --capacity-providers EC2 \
  --default-capacity-provider-strategy capacityProvider=EC2,weight=1
```

### Step 3: Create Launch Template for GPU Instances

```bash
# Create launch template
cat > launch-template.json << 'EOF'
{
  "LaunchTemplateName": "handwriting-ocr-gpu-template",
  "LaunchTemplateData": {
    "ImageId": "ami-0c7217cdde317cfec",
    "InstanceType": "g4dn.xlarge",
    "IamInstanceProfile": {
      "Name": "ecsInstanceRole"
    },
    "SecurityGroupIds": ["<security-group-id>"],
    "UserData": "IyEvYmluL2Jhc2gKZWNobyBFQ1NfQ0xVU1RFUj1oYW5kd3JpdGluZy1vY3ItY2x1c3RlciA+PiAvZXRjL2Vjcy9lY3MuY29uZmlnCmVjaG8gRUNTX0VOQUJMRV9HUFVfU1VQUE9SVD10cnVlID4+IC9ldGMvZWNzL2Vjcy5jb25maWc=",
    "BlockDeviceMappings": [
      {
        "DeviceName": "/dev/xvda",
        "Ebs": {
          "VolumeSize": 100,
          "VolumeType": "gp3",
          "DeleteOnTermination": true
        }
      }
    ],
    "TagSpecifications": [
      {
        "ResourceType": "instance",
        "Tags": [
          {
            "Key": "Name",
            "Value": "handwriting-ocr-ecs-instance"
          }
        ]
      }
    ]
  }
}
EOF

# The UserData script above (base64 decoded):
#!/bin/bash
echo ECS_CLUSTER=handwriting-ocr-cluster >> /etc/ecs/ecs.config
echo ECS_ENABLE_GPU_SUPPORT=true >> /etc/ecs/ecs.config

# Create launch template
aws ec2 create-launch-template --cli-input-json file://launch-template.json
```

### Step 4: Create Auto Scaling Group

```bash
# Create auto scaling group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name handwriting-ocr-asg \
  --launch-template LaunchTemplateName=handwriting-ocr-gpu-template,Version='$Latest' \
  --min-size 1 \
  --max-size 5 \
  --desired-capacity 2 \
  --vpc-zone-identifier "<subnet-1>,<subnet-2>" \
  --health-check-type ECS \
  --health-check-grace-period 300 \
  --tags "Key=Name,Value=handwriting-ocr-asg,PropagateAtLaunch=true"
```

### Step 5: Create ECS Task Definition with GPU

```bash
# Create task definition with GPU support
cat > task-definition-gpu.json << 'EOF'
{
  "family": "handwriting-ocr-gpu-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["EC2"],
  "cpu": "4096",
  "memory": "16384",
  "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "handwriting-ocr",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/handwriting-ocr:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "resourceRequirements": [
        {
          "type": "GPU",
          "value": "1"
        }
      ],
      "environment": [
        {
          "name": "DEVICE",
          "value": "cuda"
        },
        {
          "name": "MODEL_PATH",
          "value": "/app/models/detector/best.pt"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/handwriting-ocr",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs",
          "awslogs-create-group": "true"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

# Register task definition
aws ecs register-task-definition \
  --cli-input-json file://task-definition-gpu.json
```

### Step 6: Create Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name handwriting-ocr-alb \
  --subnets <subnet-1> <subnet-2> \
  --security-groups <alb-security-group-id> \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4

# Create target group
aws elbv2 create-target-group \
  --name handwriting-ocr-tg \
  --protocol HTTP \
  --port 8000 \
  --vpc-id <vpc-id> \
  --target-type ip \
  --health-check-enabled \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=<target-group-arn>
```

### Step 7: Create ECS Service with Auto Scaling

```bash
# Create ECS service
aws ecs create-service \
  --cluster handwriting-ocr-cluster \
  --service-name handwriting-ocr-service \
  --task-definition handwriting-ocr-gpu-task \
  --desired-count 2 \
  --launch-type EC2 \
  --network-configuration "awsvpcConfiguration={subnets=[<subnet-1>,<subnet-2>],securityGroups=[<security-group-id>],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=<target-group-arn>,containerName=handwriting-ocr,containerPort=8000" \
  --health-check-grace-period-seconds 60 \
  --placement-constraints type=distinctInstance

# Configure service auto scaling
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/handwriting-ocr-cluster/handwriting-ocr-service \
  --min-capacity 1 \
  --max-capacity 5

# CPU-based scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/handwriting-ocr-cluster/handwriting-ocr-service \
  --policy-name cpu-scaling-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleOutCooldown": 60,
    "ScaleInCooldown": 300
  }'

# Request count-based scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/handwriting-ocr-cluster/handwriting-ocr-service \
  --policy-name request-scaling-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 1000.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ALBRequestCountPerTarget",
      "ResourceLabel": "<alb-arn-suffix>/<target-group-arn-suffix>"
    },
    "ScaleOutCooldown": 60,
    "ScaleInCooldown": 300
  }'
```

### Step 8: Test Deployment

```bash
# Get ALB DNS name
aws elbv2 describe-load-balancers \
  --names handwriting-ocr-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text

# Test health endpoint
curl http://<alb-dns-name>/health

# Test OCR endpoint
curl -X POST "http://<alb-dns-name>/recognize" \
  -F "image=@test.jpeg" \
  | jq

# Monitor service
aws ecs describe-services \
  --cluster handwriting-ocr-cluster \
  --services handwriting-ocr-service

# Check running tasks
aws ecs list-tasks \
  --cluster handwriting-ocr-cluster \
  --service-name handwriting-ocr-service
```

**✅ Production ECS Deployment Complete!**

**Benefits:**
- ✅ GPU-accelerated inference
- ✅ Auto-scaling (1-5 instances)
- ✅ High availability (multi-AZ)
- ✅ Load balancing
- ✅ Health checks and auto-recovery
- ✅ Zero-downtime deployments
- ✅ Managed by AWS (less maintenance)

---

## Infrastructure as Code (Terraform)

Automate your entire AWS deployment with Terraform.

### Project Structure

```
terraform/
├── main.tf           # Main configuration
├── variables.tf      # Input variables
├── outputs.tf        # Output values
├── vpc.tf            # VPC and networking
├── ecs.tf            # ECS cluster and service
├── alb.tf            # Load balancer
├── autoscaling.tf    # Auto-scaling policies
└── cloudwatch.tf     # Monitoring and alarms
```

### main.tf

```hcl
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "handwriting-ocr-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "HandwritingOCR"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ECR Repository
resource "aws_ecr_repository" "handwriting_ocr" {
  name                 = "handwriting-ocr"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "handwriting-ocr-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "handwriting_ocr" {
  family                   = "handwriting-ocr-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["EC2"]
  cpu                      = "4096"
  memory                   = "16384"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  
  container_definitions = jsonencode([
    {
      name      = "handwriting-ocr"
      image     = "${aws_ecr_repository.handwriting_ocr.repository_url}:latest"
      essential = true
      
      portMappings = [
        {
          containerPort = 8000
          protocol      = "tcp"
        }
      ]
      
      resourceRequirements = [
        {
          type  = "GPU"
          value = "1"
        }
      ]
      
      environment = [
        {
          name  = "DEVICE"
          value = "cuda"
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/handwriting-ocr"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
          "awslogs-create-group"  = "true"
        }
      }
      
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])
}

# ECS Service
resource "aws_ecs_service" "handwriting_ocr" {
  name            = "handwriting-ocr-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.handwriting_ocr.arn
  desired_count   = var.desired_task_count
  launch_type     = "EC2"
  
  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }
  
  load_balancer {
    target_group_arn = aws_lb_target_group.handwriting_ocr.arn
    container_name   = "handwriting-ocr"
    container_port   = 8000
  }
  
  health_check_grace_period_seconds = 60
  
  placement_constraints {
    type = "distinctInstance"
  }
  
  depends_on = [aws_lb_listener.http]
}

# Launch Template for GPU Instances
resource "aws_launch_template" "ecs_gpu" {
  name_prefix   = "handwriting-ocr-gpu-"
  image_id      = var.ecs_gpu_ami
  instance_type = "g4dn.xlarge"
  
  iam_instance_profile {
    name = aws_iam_instance_profile.ecs_instance.name
  }
  
  vpc_security_group_ids = [aws_security_group.ecs_instances.id]
  
  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo ECS_CLUSTER=${aws_ecs_cluster.main.name} >> /etc/ecs/ecs.config
    echo ECS_ENABLE_GPU_SUPPORT=true >> /etc/ecs/ecs.config
  EOF
  )
  
  block_device_mappings {
    device_name = "/dev/xvda"
    
    ebs {
      volume_size           = 100
      volume_type           = "gp3"
      delete_on_termination = true
    }
  }
  
  tag_specifications {
    resource_type = "instance"
    
    tags = {
      Name = "handwriting-ocr-ecs-instance"
    }
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "ecs_gpu" {
  name                = "handwriting-ocr-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  min_size            = var.min_instances
  max_size            = var.max_instances
  desired_capacity    = var.desired_instances
  health_check_type   = "ECS"
  
  launch_template {
    id      = aws_launch_template.ecs_gpu.id
    version = "$Latest"
  }
  
  tag {
    key                 = "Name"
    value               = "handwriting-ocr-asg-instance"
    propagate_at_launch = true
  }
}
```

### variables.tf

```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "desired_task_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

variable "min_instances" {
  description = "Minimum number of EC2 instances"
  type        = number
  default     = 1
}

variable "max_instances" {
  description = "Maximum number of EC2 instances"
  type        = number
  default     = 5
}

variable "desired_instances" {
  description = "Desired number of EC2 instances"
  type        = number
  default     = 2
}

variable "ecs_gpu_ami" {
  description = "AMI ID for ECS-optimized GPU instance"
  type        = string
  default     = "ami-0c7217cdde317cfec"  # Update with latest ECS-optimized AMI
}
```

### Deploy with Terraform

```bash
# Initialize Terraform
cd terraform
terraform init

# Plan deployment
terraform plan -out=tfplan

# Apply deployment
terraform apply tfplan

# Get outputs
terraform output alb_dns_name

# Destroy infrastructure (when needed)
terraform destroy
```

**Benefits of Terraform:**
- ✅ Infrastructure as code (version controlled)
- ✅ One-command deployment
- ✅ Easy to replicate environments (dev, staging, prod)
- ✅ Automatic dependency management
- ✅ State management

---

## CI/CD Pipeline with GitHub Actions

Automate your deployment pipeline from code commit to production.

### .github/workflows/deploy.yml

```yaml
name: Deploy to AWS ECS

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: handwriting-ocr
  ECS_CLUSTER: handwriting-ocr-cluster
  ECS_SERVICE: handwriting-ocr-service
  ECS_TASK_DEFINITION: task-definition-gpu.json

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      
      - name: Run tests
        run: |
          pytest tests/ --cov=app --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml

  build-and-deploy:
    name: Build and Deploy to ECS
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT
      
      - name: Fill in the new image ID in the Amazon ECS task definition
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: ${{ env.ECS_TASK_DEFINITION }}
          container-name: handwriting-ocr
          image: ${{ steps.build-image.outputs.image }}
      
      - name: Deploy Amazon ECS task definition
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true
      
      - name: Notify on success
        if: success()
        run: |
          echo "✅ Deployment successful!"
          # Add Slack/Discord notification here
      
      - name: Notify on failure
        if: failure()
        run: |
          echo "❌ Deployment failed!"
          # Add Slack/Discord notification here

  rollback:
    name: Rollback on Failure
    runs-on: ubuntu-latest
    needs: build-and-deploy
    if: failure()
    
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Rollback to previous task definition
        run: |
          # Get previous task definition
          PREVIOUS_TASK_DEF=$(aws ecs describe-services \
            --cluster $ECS_CLUSTER \
            --services $ECS_SERVICE \
            --query 'services[0].taskDefinition' \
            --output text | sed 's/:.*$//')
          
          PREVIOUS_REVISION=$(($(echo $PREVIOUS_TASK_DEF | grep -o '[0-9]*$') - 1))
          
          # Update service to previous revision
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_SERVICE \
            --task-definition ${PREVIOUS_TASK_DEF%:*}:$PREVIOUS_REVISION
```

### Set up GitHub Secrets

```bash
# In your GitHub repository:
# Settings → Secrets and variables → Actions → New repository secret

# Add these secrets:
AWS_ACCESS_KEY_ID: <your-aws-access-key>
AWS_SECRET_ACCESS_KEY: <your-aws-secret-key>
```

---

## Monitoring & Logging

### CloudWatch Dashboard

```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name HandwritingOCR \
  --dashboard-body file://dashboard.json
```

### dashboard.json

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", {"stat": "Average"}],
          [".", "MemoryUtilization", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "ECS Resource Utilization",
        "yAxis": {
          "left": {
            "min": 0,
            "max": 100
          }
        }
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApplicationELB", "RequestCount", {"stat": "Sum"}],
          [".", "TargetResponseTime", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "ALB Metrics"
      }
    },
    {
      "type": "log",
      "properties": {
        "query": "SOURCE '/ecs/handwriting-ocr' | fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20",
        "region": "us-east-1",
        "title": "Recent Errors"
      }
    }
  ]
}
```

### CloudWatch Alarms

```bash
# High CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name handwriting-ocr-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=handwriting-ocr-service Name=ClusterName,Value=handwriting-ocr-cluster

# High error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name handwriting-ocr-high-errors \
  --alarm-description "Alert when error rate exceeds 5%" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold

# Low healthy hosts alarm
aws cloudwatch put-metric-alarm \
  --alarm-name handwriting-ocr-low-healthy-hosts \
  --alarm-description "Alert when healthy hosts < 1" \
  --metric-name HealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 1 \
  --comparison-operator LessThanThreshold
```

---

## Security Best Practices

### 1. IAM Roles and Policies

**ECS Task Execution Role:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:CreateLogGroup"
      ],
      "Resource": "*"
    }
  ]
}
```

**ECS Task Role:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::handwriting-ocr-models/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:handwriting-ocr-*"
    }
  ]
}
```

### 2. API Authentication

Add to your FastAPI app:

```python
from fastapi import Security, HTTPException, status
from fastapi.security.api_key import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_api_key(api_key: str = Security(api_key_header)):
    # Get API key from AWS Secrets Manager
    import boto3
    
    client = boto3.client('secretsmanager', region_name='us-east-1')
    response = client.get_secret_value(SecretId='handwriting-ocr-api-key')
    valid_key = response['SecretString']
    
    if api_key != valid_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key"
        )
    return api_key

# Use in endpoints:
@app.post("/recognize", dependencies=[Depends(verify_api_key)])
async def recognize_text(image: UploadFile):
    # ... your code
```

### 3. VPC Configuration

```bash
# Create private subnets for ECS tasks
# Public subnets for ALB only
# Use NAT Gateway for outbound internet access from private subnets

# Example security group rules:

# ALB security group (public)
- Inbound: 80 from 0.0.0.0/0
- Inbound: 443 from 0.0.0.0/0
- Outbound: 8000 to ECS security group

# ECS security group (private)
- Inbound: 8000 from ALB security group
- Outbound: 443 to 0.0.0.0/0 (for pulling images)
```

### 4. Secrets Management

```bash
# Store API keys in Secrets Manager
aws secretsmanager create-secret \
  --name handwriting-ocr-api-key \
  --secret-string "your-secret-api-key-here"

# Reference in task definition
{
  "secrets": [
    {
      "name": "API_KEY",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:account-id:secret:handwriting-ocr-api-key"
    }
  ]
}
```

---

## Cost Optimization

### 1. Use Spot Instances (Save 70%)

```bash
# Add spot capacity provider to ECS cluster
aws ecs put-cluster-capacity-providers \
  --cluster handwriting-ocr-cluster \
  --capacity-providers FARGATE FARGATE_SPOT EC2 \
  --default-capacity-provider-strategy \
    capacityProvider=FARGATE_SPOT,weight=4 \
    capacityProvider=FARGATE,weight=1
```

### 2. Reserved Instances (Save 30-40%)

If you have predictable usage, purchase reserved instances:

```bash
# 1-year commitment: 30% savings
# 3-year commitment: 40% savings

# Purchase through AWS Console:
# EC2 → Reserved Instances → Purchase Reserved Instances
# Instance type: g4dn.xlarge
# Term: 1 or 3 years
```

### 3. Auto-Scaling to Zero

```python
# Configure scheduled scaling to scale down during off-hours

# Scale down at night (11 PM - 6 AM)
aws application-autoscaling put-scheduled-action \
  --service-namespace ecs \
  --resource-id service/handwriting-ocr-cluster/handwriting-ocr-service \
  --scheduled-action-name scale-down-night \
  --schedule "cron(0 23 * * ? *)" \
  --scalable-target-action MinCapacity=0,MaxCapacity=1

# Scale up in morning
aws application-autoscaling put-scheduled-action \
  --service-namespace ecs \
  --resource-id service/handwriting-ocr-cluster/handwriting-ocr-service \
  --scheduled-action-name scale-up-morning \
  --schedule "cron(0 6 * * ? *)" \
  --scalable-target-action MinCapacity=1,MaxCapacity=5
```

### 4. S3 Lifecycle Policies

```bash
# Delete old logs after 30 days
aws s3api put-bucket-lifecycle-configuration \
  --bucket handwriting-ocr-logs \
  --lifecycle-configuration file://lifecycle.json

# lifecycle.json:
{
  "Rules": [
    {
      "Id": "DeleteOldLogs",
      "Status": "Enabled",
      "Expiration": {
        "Days": 30
      },
      "Filter": {
        "Prefix": "logs/"
      }
    }
  ]
}
```

### 5. Use S3 Intelligent-Tiering

```bash
# Automatically move infrequently accessed models to cheaper storage
aws s3api put-bucket-intelligent-tiering-configuration \
  --bucket handwriting-ocr-models \
  --id IntelligentTiering \
  --intelligent-tiering-configuration file://tiering.json
```

### Cost Breakdown with Optimizations

| Configuration | Monthly Cost | Savings |
|---------------|--------------|---------|
| **Baseline (2x g4dn.xlarge 24/7)** | $760 | - |
| **+ Auto-scaling (avg 1.5 instances)** | $570 | 25% |
| **+ Spot instances (70% discount)** | $228 | 60% |
| **+ Scheduled scaling (off-hours)** | $150 | 67% |
| **+ Reserved instances (1-year)** | $532 | 30% |

**Recommended:** Auto-scaling + Scheduled scaling = **~$150-250/month**

---

## Troubleshooting

### Common Issues

#### 1. Task Fails to Start

**Symptoms:**
- Tasks repeatedly fail health checks
- "Essential container exited" errors

**Solutions:**
```bash
# Check task logs
aws logs tail /ecs/handwriting-ocr --follow

# Common issues:
- Model file not found → Mount S3 or include in image
- Out of memory → Increase task memory
- GPU not detected → Check resourceRequirements in task definition
- Image pull failed → Check ECR permissions
```

#### 2. High Latency

**Symptoms:**
- Response time > 1000ms
- CloudWatch shows high P95 latency

**Solutions:**
```bash
# Scale up instances
aws ecs update-service \
  --cluster handwriting-ocr-cluster \
  --service handwriting-ocr-service \
  --desired-count 4

# Check GPU utilization
nvidia-smi

# Optimize model (ONNX, quantization)
# Increase ALB deregistration delay
# Add CloudFront CDN for caching
```

#### 3. Out of Memory (OOM)

**Symptoms:**
- Task exits with code 137
- "Cannot allocate memory" errors

**Solutions:**
```bash
# Increase task memory
aws ecs register-task-definition \
  --family handwriting-ocr-task \
  --memory 32768  # Increase from 16384

# Reduce batch size in inference
# Clear CUDA cache after each request
# Use mixed precision (FP16)
```

#### 4. Auto-Scaling Not Working

**Symptoms:**
- Tasks don't scale up under load
- CPU high but no new tasks launched

**Solutions:**
```bash
# Check scaling policies
aws application-autoscaling describe-scaling-policies \
  --service-namespace ecs

# Check CloudWatch alarms
aws cloudwatch describe-alarms

# Verify IAM permissions for auto-scaling
# Check EC2 instance capacity (ASG might be at max)
```

#### 5. Image Pull Timeout

**Symptoms:**
- "CannotPullContainerError"
- Tasks stuck in PENDING

**Solutions:**
```bash
# Increase timeout in task definition
"stopTimeout": 120

# Use smaller base image
# Enable ECR image scanning
# Check VPC endpoints for ECR
```

### Debugging Commands

```bash
# View task details
aws ecs describe-tasks \
  --cluster handwriting-ocr-cluster \
  --tasks <task-id>

# View container logs
aws logs get-log-events \
  --log-group-name /ecs/handwriting-ocr \
  --log-stream-name ecs/handwriting-ocr/<task-id>

# Check service events
aws ecs describe-services \
  --cluster handwriting-ocr-cluster \
  --services handwriting-ocr-service \
  --query 'services[0].events[0:10]'

# SSH into EC2 instance (for debugging)
aws ssm start-session --target <instance-id>

# Check running containers
docker ps
docker logs <container-id>
docker exec -it <container-id> bash
```

---

## Summary & Next Steps

### Deployment Options Comparison

| Option | Setup Time | Cost/Month | GPU | Auto-Scaling | Best For |
|--------|-----------|------------|-----|--------------|----------|
| **Simple EC2** | 1-2h | $380 | ✅ | ❌ | MVP, Testing |
| **ECS Fargate** | 3-4h | $200-400 | ❌ | ✅ | CPU inference |
| **ECS EC2 GPU** | 4-6h | $500-800 | ✅ | ✅ | **Production** |

### Recommended Path

1. **Start with Simple EC2** for quick MVP and testing
2. **Migrate to ECS EC2 GPU** for production with auto-scaling
3. **Add Terraform** for infrastructure as code
4. **Set up CI/CD** for automated deployments
5. **Optimize costs** with spot instances and scheduled scaling

### Checklist

- [ ] AWS account created and configured
- [ ] Docker image built and tested locally
- [ ] ECR repository created
- [ ] ECS cluster with GPU support
- [ ] Task definition with GPU requirements
- [ ] ALB with health checks
- [ ] Auto-scaling policies configured
- [ ] CloudWatch monitoring enabled
- [ ] Security groups and IAM roles configured
- [ ] CI/CD pipeline set up
- [ ] Load testing completed
- [ ] Documentation updated

---

**🎉 Congratulations!** You now have a production-ready AWS deployment for your handwriting OCR system.

**Next:** [07_PRODUCTION_CHECKLIST.md](./07_PRODUCTION_CHECKLIST.md) for final pre-launch verification.
