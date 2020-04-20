window.addEventListener('load', function(event) {
	const LOADER = document.getElementById('LOADER');
	const PRECACHER = document.getElementById('PRECACHER');
	LOADER.parentNode.removeChild(LOADER);
	PRECACHER.parentNode.removeChild(PRECACHER);
})

// TOOLS
const socket = io();

const ANIMLOG = {
	running: false,
	switchOn: () => this.running = true,
	switchOff: () => {
		this.running = false;
		this.onSwitchOff();
    },
    onSwitchOn: () => null,
    onSwitchOff: () => null,
};

ANIMLOG.switchOn();

ANIMLOG.onSwitchOff = () => { socket.emit('RequestNextPlayer'); };

ANIMLOG.switchOff();

// STACK STYLING
const CARDS_IN_STACK = document.querySelectorAll('#STACK .card');
let distance = 0;
for (let card of CARDS_IN_STACK) {
	const offset = 4;
	card.style.top  = `${distance}px`;
	card.style.left = `${distance}px`;
	distance += offset; 
}


// GET URL DATA & SEND TO SERVER
const { nickname, room, avatar } = Qs.parse(location.search, {
	ignoreQueryPrefix: true
});

socket.emit('joinRoom', { nickname, room, avatar });
// RENDER ROOM CODE
renderRoomCode(room); 


// GET ROOM, PLAYERS & CARDS FROM SERVER
socket.on('roomData', ({ players, cards, card, next }) => {
	renderPlayers(players, card);
});

socket.on('turn', () => {
	unblock();
});

socket.on('stopWatchPermits', () => {
	const STOPWATCH = document.getElementById('STOPWATCH');
	STOPWATCH.setAttribute('data-stopwatch-permits', 'true');
	// STOPWATCH.onclick = () => startTimer();
	STOPWATCH.onclick = () => {
		STOPWATCH.onclick = () => null;
		socket.emit('startTimerReq', room);
	};
});

socket.on('startTimer', () => {
	startTimer();
});

socket.once('playerId', ({playerId}) => {
	local_id = playerId;
});

// UNBLOCK GAME
function unblock(init = false) {
	const TOP_CARD_IN_STACK = CARDS_IN_STACK[CARDS_IN_STACK.length - 1];
	animate(TOP_CARD_IN_STACK, 'wobble', () => {
		TOP_CARD_IN_STACK.classList.add('clickable');
		TOP_CARD_IN_STACK.onclick = requestCard;
	});

	// REQUEST CARD DRAW
	function requestCard(e) {
		e.target.onclick = () =>  false ;
		e.target.classList.remove('clickable');
		ANIMLOG.value = 'false';
		socket.emit('drawCard', room);
	}
	
}

// CARD DRAWN
socket.on('cardDrawn', card =>  drawCard(card));

// DISCARD ACTION CARD
socket.on('discardAction', ({ card }) => {
	discard(card);
});


// PLACE RULE
socket.on('rulePlaced', ({ card }) => {
	placeRuleCard(card);
});


// MUST REPLACE RULE
socket.on('ruleReplaceMsg', ({ card }) => {
	const card_name = fileNameParse(card.name);
	const imgFile = `${card_name}-min.jpg`;
	const src = `../img/cards/Rule/${imgFile}`;

	let rule1 = document.querySelectorAll('.rule_holder .card')[0].style.backgroundImage;
		rule1 = rule1.replace(/"/g, "'");

	let rule2 = document.querySelectorAll('.rule_holder .card')[1].style.backgroundImage;
		rule2 = rule2.replace(/"/g, "'");

	playerAlert(`
<div class="group">
	<h1>Replace a rule!</h1>
	<p>
		You picked a rule card, but there are already two in use.<br>
		Pick which one you would like to replace:
	</p>
</div>
<div class="group" style="display: flex;">
	<div class="card new-rule" style="background-image: url('../img/cards/Rule/${imgFile}'); margin-right: 50px;">
		<span>NEW</span>
	</div>
	<div class="card pointer" id="rule_pick1" onclick="selectRule(1, '${card_name}')" style="background-image:${rule1};"></div>
	<div class="card pointer" id="rule_pick2" onclick="selectRule(2, '${card_name}')" style="background-image:${rule2};margin-left: 12px;"></div>
</div>
<div class="group last">
	<button class="button disabled" id="rule_pickBtn" disabled>Replace!</button>
</div>`
	);
});


// REPLACE RULE
socket.on('ruleReplaced', ({num, card}) => {
	replaceRule(num, card);
});

socket.on('stateAttached', card => {
	stateCardAlert(card);
});

// EVERYONE DRINKS
socket.on('everyoneDrinks', () => {
	//const APP = document.getElementById('APP');
	animate(document.querySelector('body'), 'shake');
	playerAlert(
`
<div class="group">
	<h1 class="animated shake" style="font-size:60px;">EVERYONE DRINKS!!</h1>
</div>
<button class="button bg-blue shadow" onclick="closeAlert('drinkAlert')">Continue</button>	
`,
		() => setTimeout(() => closeAlert('drinkAlert') ,3000);
	);
});

// END OF GAME
socket.on('endGame', () => {
	const stack = document.getElementById('STACK');
		  stack.style.visibility = 'hidden';
	setTimeout(() => {
		playerAlert(`
		<h1>GAME OVER!</h1>
		<p>
			That's all folks!
		</p>`);
	}, 5000);
});

/*

	-- FUNCTIONS --

*/
// REQUEST NEXT PLAYER
function requestNextPlayer() {
	socket.emit('reqNextPlayer', room);
}

// FILE NAME PARSE
function fileNameParse(str) {
	str = str.replace(/ /g, '_');
	str = str.replace(/!/g, '');
	str = str.replace(/'/g, '');
	str = str.replace(/&/g, 'and');
	str = str.toLowerCase();
	return str;
}

// ANIMATE
function animate(elem, animationName, callback, speed) {
	SETTINGS.animating = true;
	speed = 'fast';

	if (typeof speed === 'string') {
		elem.classList.add('animated', animationName, speed);
	}
	else {
		elem.classList.add('animated', animationName, speed);
	}

	elem.addEventListener('animationend', function removeAnimation() {
		elem.classList.remove('animated', animationName);
		elem.removeEventListener('animationend', removeAnimation);

		if (typeof callback === 'function') {
			callback();
		}
	});
}

// RENDER ROOM CODE
function renderRoomCode(room) {
	const ROOMCODE_FIELD = document.getElementById('ROOMCODE_FIELD');
		  ROOMCODE_FIELD.innerHTML = room;
}

// RENDER PLAYERS
function renderPlayers(players, card) {
	var stateCard = card ? card : false;

	const PLAYERS_LIST = document.getElementById('PLAYERS_LIST');
		  PLAYERS_LIST.innerHTML = '';

	for (let player of players) {
		const moderator_tag = player.moderator ? `<span class="moderator">Moderator</span>` : '';
		const turn_class = player.turn ? 'active' : '';

		var weakness = '';
		var power    = '';
		var cardName = '';

		if (player.stateCards.weakness.length > 0) {
			for (let wkns of player.stateCards.weakness) {
				cardName = fileNameParse(wkns);
				var func = `onclick="zoomCard(this)"`;
				weakness += `
				<div ${func} class="card" data-state-type="Weakness" data-card-name="${cardName}" style="background-image: url('../img/cards/Weakness/${cardName}-min.jpg');"></div>`;
			}
		}

		if (player.stateCards.power.length > 0) {
			for (let pwr of player.stateCards.power) {
				cardName = fileNameParse(pwr);
				var func = `onclick="zoomCard(this)"`;
				power += `
				<div ${func} class="card" data-state-type="Power" data-card-name="${cardName}" style="background-image: url('../img/cards/Power/${cardName}-min.jpg');"></div>`;
			}
		}

		PLAYERS_LIST.innerHTML += `
		<li class="player ${turn_class}">
			${moderator_tag}
			<div class="avatar av${player.avatar}"></div>
			<span class="nickname">${player.nickname}</span>
			<div class="state_cards">
				${weakness}
				${power}
			</div>
		</li>`;
	}
}

// DRAW CARD
function drawCard(card) {
	const TOP_CARD_IN_STACK = CARDS_IN_STACK[CARDS_IN_STACK.length - 1];
	animate(TOP_CARD_IN_STACK, 'hinge', () => {
		switch(card.type) {
			case 'Action':
				socket.emit('actionCard', { card, room });
				break;

			case 'Rule':
				let current_ruleCards = document.querySelectorAll('.rule_holder .card')
				if (current_ruleCards.length === 2) {
					socket.emit('mustReplaceRule', { card, room });
				}
				else {
					socket.emit('placeRule', { card, room });
				}
				break;

			case 'Power':
				socket.emit('stateCard', { card, room });
				break;

			case 'Weakness':
				socket.emit('stateCard', { card, room });
				break;
		}
		ANIMLOG.onchange = () => {
			requestNextPlayer();
			ANIMLOG.onchange = null;	
		};
	});
}

// DISCARD CARD
function discard(card) {
	const HOLDER = document.getElementById('DISCARDED_CARDS');
	var top;
	var left;

	if (holder.childNodes.length === 0) {
		top = 0;
		left = 0;
	}
	else {
		let previousCard = holder.childNodes[holder.childNodes.length - 1];

		top = previousCard.style.top;
		top = parseInt(top.replace('px', ''));
		top++;

		left = previousCard.style.left;
		left = parseInt(left.replace('px', ''));
		left += 3;
	}
	let card_name = fileNameParse(card.name);
	let imgFile = `${card_name}-min.jpg`;
	let src = `../img/cards/${card.type}/${imgFile}`;
	let newCard = document.createElement('div');
		  newCard.classList.add('card');
		  newCard.style.backgroundImage = `url('${src}')`;
		  newCard.style.position = 'absolute';
		  newCard.style.top = `${top}px`;
		  newCard.style.left = `${left}px`;
		  newCard.style.zIndex = '700';
	HOLDER.appendChild(newCard);
	animate(newCard, 'tada', () => {
		newCard.style.zIndex = '1';
		ANIMLOG.value = 'false';
		if (ANIMLOG.onchange) {
			ANIMLOG.onchange();
		}
		socket.emit('animationOverReq');
	});
}

// PLACE RULE CARD
function placeRuleCard(card) {
	let card_name = fileNameParse(card.name);
	let imgFile = `${card_name}-min.jpg`;
	let src = `../img/cards/Rule/${imgFile}`;

	let div = document.createElement('div');
	      div.classList.add('card');
		  div.style.backgroundImage = `url(${src})`;
	
	const RULE_HOLDERS = document.getElementsByClassName('rule_holder');	
	let ruleHolder1_empty = (document.querySelector('.rule_holder .card')) ? false : true;

	if (ruleHolder1_empty) {
		RULE_HOLDERS[0].appendChild(div);
	}
	else {
		RULE_HOLDERS[1].appendChild(div);
	}

	animate(div, 'tada', () => {
		const CHANGE_ANIMLOG = ANIMLOG.onchange ? ANIMLOG.onchange() : false;
		socket.emit('animationOverReq');
	});	
}

// SELECT RULE
function selectRule(num, card) {
	const RUL1 = document.getElementById('rule_pick1');
	const RUL2 = document.getElementById('rule_pick2');
	const BTN  = document.getElementById('rule_pickBtn');

	if (num === 1) {
		RUL1.classList.add('selected');
		RUL2.classList.remove('selected');
	}
	else {
		RUL2.classList.add('selected');
		RUL1.classList.remove('selected');
	}

	BTN.removeAttribute('disabled');
	BTN.classList.remove('disabled');
	BTN.classList.add('bg-blue', 'shadow');
	BTN.onclick = () => {
		socket.emit('replaceRule', { num, card, room });
		closeAlert('playerAlert');
	};
}

// REPLACE RULE CARD
function replaceRule(num, card) {
	let idx = num - 1;

	let old_rule = document.querySelectorAll('.rule_holder .card')[idx];
	    old_rule.parentNode.removeChild(old_rule);

	let newCard = document.createElement('div');
		newCard.classList.add('card');
		newCard.style.backgroundImage = `url(\'../img/cards/Rule/${card}-min.jpg\')`;

	let rule_holder = document.querySelectorAll('.rule_holder')[idx];
		rule_holder.appendChild(newCard);
	animate(newCard, 'tada', () => {
		ANIMLOG.value = 'false';
		if (ANIMLOG.onchange) {
			ANIMLOG.onchange();
		}
		socket.emit('animationOverReq');
	});
}

// PLAYER ALERT
function playerAlert(content, type = 'playerAlert') {
	const APP = document.getElementById('APP');

	let modal = document.createElement('div');
		modal.classList.add('modal', 'full-height', 'content-centered', type);

	let msgbox = document.createElement('div');
		msgbox.classList.add(
		  	'bg-white',
		  	'border',
		  	'border-radius',
		  	'shadow',
		  	'padding'
	);

	msgbox.innerHTML = content;
	modal.appendChild(msgbox);
	APP.appendChild(modal);
	animate(msgbox, 'rubberBand');
}

// STATE CARD ALERT
function stateCardAlert(card) {
	const APP = document.getElementById('APP');

	let modal = document.createElement('div');
		modal.classList.add('modal', 'full-height', 'stateAlert');
	
	let innerModal = document.createElement('div');
		  innerModal.classList.add('full-height', 'content-centered');
	modal.appendChild(innerModal);

	let splat = document.createElement('div');
		  splat.classList.add('full-height', 'splat', card.type.toLowerCase());
	innerModal.appendChild(splat);

	const fileName = fileNameParse(card.name);
	const _card = document.createElement('div');
		  _card.classList.add('card', 'bigger');
		  _card.style.backgroundImage = `url('../img/cards/${card.type}/${fileName}-min.jpg')`;
	innerModal.appendChild(_card);

	APP.appendChild(modal);

	animate(splat, 'rubberBand');
	animate(innerModal, 'tada', () => {
		setTimeout(() => {
			animate(modal, 'fadeOut', function() {
				closeAlert('stateAlert');
				const attached_card = document.querySelector(`.card[data-card-name="${fileNameParse(card.name)}"]`);
				animate(attached_card, 'flip', ANIMATION_END, 'faster');
				});		
		}, 5000);
	});
}

// ZOOM CARD
function zoomCard(card) {
	const cardName = card.getAttribute('data-card-name');
	const cardType = card.getAttribute('data-state-type');
	playerAlert(`
	<div class="group">
		<div class="card bigger" style="background-image: url('../img/cards/${cardType}/${cardName}-min.jpg')"></div>
	</div>
	<button class="button bg-blue shadow" onclick="closeAlert('playerAlert')">Close</button>
	`);
}

// CLOSE ALERT
function closeAlert(type) {
	console.log(type);
	const msgbox = document.querySelector(`.modal.${type}>div`);
		  msgbox.innerHTML = '';

	const modal = document.querySelector(`.modal.${type}`);
		  modal.innerHTML =  '';
		  modal.parentNode.removeChild(modal);	
}

function startTimer(time=60) {
	//STOPWATCH.onclick = () => null;

	const COUNTER = document.querySelector('#STOPWATCH span');
	const COUNTDOWN = setInterval(() => {
		var minutes = Math.floor(time / 60);
		var seconds = time % 60;
		seconds = seconds < 10 ? '0' + seconds : seconds;
		COUNTER.innerHTML = `${minutes}:${seconds}`;
		if (time === 0) {
			clearInterval(COUNTDOWN);
			// socket.emit('timeOut', room);
			animate(document.querySelector('body'), 'shake');
			playerAlert(`
			<div class="group">
				<h1 class="animated shake" style="font-size: 60px;">EVERYONE DRINKS!!</h1>
			</div>
			<button class="button bg-blue shadow" onclick="closeAlert('drinkAlert')">Continue</button>
			`,
			'drinkAlert');
			const STOPWATCH = document.getElementById('STOPWATCH');
			let permits = STOPWATCH.getAttribute('data-stopwatch-permits');
			if (permits === 'true') {
				STOPWATCH.onclick = () => {
					STOPWATCH.onclick = () => null;
					socket.emit('startTimerReq', room);
				};
			}
		}
		else {
			time--;
		}
	}, 100);
}