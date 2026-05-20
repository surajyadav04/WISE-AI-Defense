# Use Python 3.9
FROM python:3.9

# Set the working directory
WORKDIR /code

# Copy requirements and install them
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy all your files
COPY . /code

# Create a writable directory for the database (Critical for SQLite)
RUN mkdir -p /code/data && chmod 777 /code/data

# Tell the cloud to use Port 7860
EXPOSE 7860

# Command to run the app
CMD ["python", "app.py"]