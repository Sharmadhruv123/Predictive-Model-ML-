import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

Base = declarative_base()

class PipelineRun(Base):
    __tablename__ = 'pipeline_runs'
    id = Column(String, primary_key=True)
    status = Column(String) # running, success, failed
    start_time = Column(DateTime)
    end_time = Column(DateTime, nullable=True)

class PipelineStage(Base):
    __tablename__ = 'pipeline_stages'
    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String, ForeignKey('pipeline_runs.id'))
    stage_name = Column(String)
    status = Column(String)
    rows_in = Column(Integer, nullable=True)
    rows_out = Column(Integer, nullable=True)
    start_time = Column(DateTime)
    end_time = Column(DateTime, nullable=True)
    log_message = Column(String, nullable=True)

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///../backend/mlplatform.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def create_run(run_id: str):
    db = SessionLocal()
    run = PipelineRun(id=run_id, status="running", start_time=datetime.utcnow())
    db.add(run)
    db.commit()
    db.close()

def update_run(run_id: str, status: str):
    db = SessionLocal()
    run = db.query(PipelineRun).filter(PipelineRun.id == run_id).first()
    if run:
        run.status = status
        if status in ["success", "failed"]:
            run.end_time = datetime.utcnow()
        db.commit()
    db.close()

def log_stage(run_id: str, stage_name: str, status: str, rows_in: int=None, rows_out: int=None, log_message: str=None):
    db = SessionLocal()
    stage = db.query(PipelineStage).filter(PipelineStage.run_id == run_id, PipelineStage.stage_name == stage_name).first()
    if not stage:
        stage = PipelineStage(run_id=run_id, stage_name=stage_name, status=status, start_time=datetime.utcnow())
        db.add(stage)
    else:
        stage.status = status
        if rows_in is not None:
            stage.rows_in = rows_in
        if rows_out is not None:
            stage.rows_out = rows_out
        if log_message is not None:
            stage.log_message = log_message
        if status in ["success", "failed"]:
            stage.end_time = datetime.utcnow()
    db.commit()
    db.close()
