const BTN_JOIN = document.getElementById('BTN_JOIN');
const BTN_CREATE = document.getElementById('BTN_CREATE');

BTN_JOIN.addEventListener('click', loadForm);
BTN_CREATE.addEventListener('click', loadForm);

function loadForm(e) {
	e.preventDefault();
	const ENTRANCE = document.getElementById('ENTRANCE');
	const ENTRANCE_FORM = document.getElementById('ENTRANCE_FORM');
	const FORM_HEADER = document.getElementById('FORM_HEADER');
	const ROOM_CODE_FIELD = document.getElementById('ROOM_CODE_FIELD');

	ENTRANCE.classList.add('hidden');
	ENTRANCE_FORM.classList.remove('hidden');
	
	// JOIN
	if (this.id === 'BTN_JOIN') {
		FORM_HEADER.innerText = 'Join an existing room!';
		
		if (ROOM_CODE_FIELD.classList.contains('hidden')) {
			ROOM_CODE_FIELD.classList.remove('hidden');
		}
	}

	// CREATE
	if (this.id === 'BTN_CREATE') {
		generateRoomCode();
		FORM_HEADER.innerText = 'Create a new room!';

		if (!ROOM_CODE_FIELD.classList.contains('hidden')) {
			ROOM_CODE_FIELD.classList.add('hidden');
		}
	}

	// AVATARS
	const AVATARS = document.getElementsByClassName('avatar');
	for (let avatar of AVATARS) {
		avatar.onclick = (e) => {
			for (let av of AVATARS) {
				av.classList.remove('active');
			}
			e.target.classList.add('active');
			const AVATAR_VAL_HOLDER = document.getElementById('AVATAR_VAL_HOLDER');
			AVATAR_VAL_HOLDER.value = e.target.getAttribute('data-avatar-num');
		};
	}

	// BACK
	const BACK_BTN = document.getElementById('BACK_TO_ENTRANCE');
	BACK_BTN.onclick = () => {
		resetRoomCode();
		ENTRANCE_FORM.classList.add('hidden');
		ENTRANCE.classList.remove('hidden');
	};
}

// CREATE ROOM CODE
function generateRoomCode() {
	const ROOM_CODE_FIELD = document.querySelector('#ROOM_CODE_FIELD input');

	let date = new Date();
	let room_code = `${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;

	ROOM_CODE_FIELD.value = room_code;
}

// RESET ROOM CODE
function resetRoomCode() {
	const ROOM_CODE_FIELD = document.querySelector('#ROOM_CODE_FIELD input');
	ROOM_CODE_FIELD.value = '';

}