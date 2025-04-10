# Start from the official AWS SAM build image for Python 3.11
FROM public.ecr.aws/sam/build-python3.11:latest

# Upgrade pip & wheel to avoid old-wrapper errors
RUN python -m pip install --upgrade pip wheel
