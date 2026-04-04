from flask import Blueprint, request, jsonify, g
from services.worker_service import WorkerService
from utils.auth_middleware import token_required, role_required

worker_bp = Blueprint('worker', __name__)
worker_service = WorkerService()


@worker_bp.route('', methods=['GET'])
def list_workers():
    available_only = request.args.get('available', 'true').lower() == 'true'
    return jsonify(worker_service.list_workers(available_only)), 200


@worker_bp.route('/register', methods=['POST'])
@token_required
@role_required('Worker')
def register_worker():
    data = request.get_json(silent=True) or {}
    required = ('skills', 'daily_rate', 'location')
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({'error': f'Missing: {", ".join(missing)}'}), 400

    result = worker_service.register_worker(
        user_id=g.current_user['id'],
        skills=data['skills'],
        daily_rate=float(data['daily_rate']),
        location=data['location'],
        bio=data.get('bio', ''),
    )
    if not result['success']:
        return jsonify({'error': result['error']}), 400
    return jsonify({'message': 'Worker profile created/updated'}), 200


@worker_bp.route('/jobs', methods=['GET'])
@token_required
def my_jobs():
    jobs = worker_service.get_my_jobs(g.current_user['id'], g.current_user['role_name'])
    return jsonify(jobs), 200


@worker_bp.route('/jobs/open', methods=['GET'])
@token_required
def get_open_jobs():
    jobs = worker_service.get_open_jobs()
    return jsonify(jobs), 200

@worker_bp.route('/jobs', methods=['POST'])
@token_required
@role_required('Farmer')
def request_job():
    data = request.get_json(silent=True) or {}
    required = ('job_description', 'expected_days', 'agreed_rate')
    missing = [f for f in required if data.get(f) is None]
    if missing:
        return jsonify({'error': f'Missing: {", ".join(missing)}'}), 400

    worker_id = data.get('worker_id')
    worker_id = int(worker_id) if worker_id else None

    result = worker_service.request_job(
        farmer_id=g.current_user['id'],
        worker_id=worker_id,
        description=data['job_description'],
        location=data.get('location', ''),
        expected_days=int(data['expected_days']),
        agreed_rate=float(data['agreed_rate']),
    )
    if not result['success']:
        return jsonify({'error': result['error']}), 400
    return jsonify(result), 201


@worker_bp.route('/jobs/<int:job_id>/status', methods=['PATCH'])
@token_required
def update_job_status(job_id):
    data = request.get_json(silent=True) or {}
    new_status = data.get('status', '').strip()
    note       = data.get('note', '')
    if not new_status:
        return jsonify({'error': 'status is required'}), 400

    result = worker_service.update_job_status(job_id, new_status, g.current_user['id'], note)
    if not result['success']:
        return jsonify({'error': result['error']}), 400
    return jsonify({'message': f'Job status updated to {new_status}'}), 200

@worker_bp.route('/jobs/<int:job_id>/accept', methods=['POST'])
@token_required
@role_required('Worker')
def accept_open_job(job_id):
    result = worker_service.accept_open_job(job_id, g.current_user['id'])
    if not result['success']:
        return jsonify({'error': result['error']}), 400
    return jsonify({'message': 'Job accepted successfully'}), 200
