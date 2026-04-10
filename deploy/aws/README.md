# AWS deployment with GitHub Actions

This repo now includes a GitHub Actions workflow at `.github/workflows/deploy-aws-ecs.yml`.

## What it does

On every push to `main` or a manual workflow dispatch, the pipeline:
1. assumes an AWS IAM role through GitHub OIDC
2. logs in to Amazon ECR
3. builds the Docker image from the repo root
4. pushes two tags to ECR: `latest` and the full Git commit SHA
5. updates the ECS task definition with the new image
6. deploys the updated task definition to the ECS service and waits for stability

## Recommended architecture

- React frontend served from Express in one container
- Express API + Socket.IO in the same container
- MongoDB Atlas or Amazon DocumentDB for persistent data
- ECS/Fargate for hosting
- S3 for large brochures and downloadable materials
- CloudFront + Route 53 + ACM for public delivery

## Required AWS resources

Create these before running the workflow:

- An ECR repository
- An ECS cluster
- An ECS service running Fargate
- An ECS task execution role
- An ECS task role
- A CloudWatch log group
- Secrets in AWS Secrets Manager for:
  - `MONGO_URI`
  - `JWT_SECRET`

## Required GitHub configuration

### GitHub Secrets

- `AWS_ROLE_TO_ASSUME` = IAM role ARN trusted for GitHub OIDC

### GitHub Repository Variables

- `AWS_REGION` = for example `us-east-1`
- `ECR_REPOSITORY` = for example `solution-architect-roadmap`
- `ECS_CLUSTER` = your ECS cluster name
- `ECS_SERVICE` = your ECS service name

## IAM trust policy for GitHub OIDC

Attach a trust relationship similar to this to the deploy role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:<github-org-or-user>/<repo-name>:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

## Task definition setup

Use `deploy/aws/ecs-task-definition.json` and replace all placeholder values:

- `<account-id>`
- `<region>`
- `executionRoleArn`
- `taskRoleArn`
- `CLIENT_URL`
- Secrets Manager ARNs

The workflow replaces only the container image field at deploy time. All other values come from this task definition file.

## One-time ECS notes

- The ECS service should point to an Application Load Balancer target group on port `5000`
- Health check path should be a route that returns success from Express, such as `/` or a dedicated `/api/health` if you add one
- If you want zero-downtime behavior, configure the ECS deployment circuit breaker and minimum healthy percent settings

## Production note for uploads

The current app includes local upload storage. ECS task storage is ephemeral, so uploaded files will not survive task replacement.

For production, move uploads to S3 using this pattern:
1. frontend requests a presigned S3 URL from the API
2. frontend uploads directly to S3
3. frontend stores the returned S3 URL in course metadata

## Triggering deployment

After setting the GitHub secret, repository variables, and AWS resources:

1. commit these files
2. push to `main`
3. open the Actions tab and monitor `Deploy to AWS ECS`

## What I could verify here

I could prepare the workflow and deployment files, but I could not actually run the GitHub Action or deploy to AWS from this environment because there is no access to your GitHub repository or AWS account here.
