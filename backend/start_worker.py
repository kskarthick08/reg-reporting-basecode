"""
Job Worker Startup Script

Starts the background job worker process that processes queued jobs.
This should be run as a separate process from the main FastAPI server.

Usage:
    python start_worker.py
    
Or with environment variables:
    DATABASE_URL=postgresql://... python start_worker.py
"""

import asyncio
import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.services.job_worker import start_job_worker
from app.config import settings

def main():
    """Main entry point for the job worker"""
    print("=" * 60)
    print("Regulatory Reporting AI Platform - Job Worker")
    print("=" * 60)
    print(f"Environment: {settings.environment}")
    print(f"Database: {settings.database_url[:50]}...")
    print(f"Poll Interval: {getattr(settings, 'job_poll_interval', 5)} seconds")
    print("=" * 60)
    print("Starting job worker...")
    print("Press Ctrl+C to stop")
    print("=" * 60)
    
    try:
        asyncio.run(start_job_worker())
    except KeyboardInterrupt:
        print("\nShutting down job worker...")
        sys.exit(0)
    except Exception as e:
        print(f"\nFatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
