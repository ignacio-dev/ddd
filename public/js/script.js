// FAKE GAME END
document.addEventListener('keypress', e => {
	if (e.code === 'KeyK') {
		socket.emit('endGameReq', room);
	}
});

// TOOLS
const socket = io();
const ANIMLOG = document.getElementById('ANIMLOG');
const SETTINGS = {
	sound: true
};

// LOCAL DATA HOLDERS
var local_id;
var firstMove = false;
socket.on('init', () => firstMove = true);

// DOM ELEMENTS
const APP = document.getElementById('APP');

const SOUND_TOGGLER = document.querySelector('#SOUND_TOGGLER .icon');
	  SOUND_TOGGLER.onclick = toggleSound;

const HELP = document.getElementById('HELP');
	  HELP.onclick = toggleHelp;

const IDRANK_BTN = document.getElementById('IDRANK');
	  IDRANK_BTN.onclick = iDrank;

// LOADER & PRECACHER
window.addEventListener('load', () => {
	socket.on('preCacheImgs', precache_data => {
		// PRE-CACHE IMAGES
		for (let card of precache_data) {
			let name = fileNameParse(card.name);
			let src = `../img/cards/${card.type}/${name}-min.jpg`;
			let img = new Image();
			img.src = src;
		}
				
		// REMOVE LOADER & SOUND PRE-CACHER
		const LOADER = document.getElementById('LOADER');
		const SOUND_PRECACHER = document.getElementById('SOUND_PRECACHER');
		LOADER.parentNode.removeChild(LOADER);
		SOUND_PRECACHER.parentNode.removeChild(SOUND_PRECACHER);
	});
	socket.emit('imgPreCacheReq');
});

// STACK STYLING
const CARDS_IN_STACK = document.querySelectorAll('#STACK .card');
const TOP_CARD_IN_STACK = CARDS_IN_STACK[CARDS_IN_STACK.length - 1];
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
socket.on('roomData', ({ players, cards, card, next, remove_rules, ruleRemove }) => {
	renderPlayers(players, card);
	if (remove_rules === true) removeRules();
	if (ruleRemove) {
		let rule = document.querySelector(`.rule_holder .card[data-card-name="${ruleRemove}"]`);
		rule.parentNode.removeChild(rule);
	}

});

// PLAYER ID
socket.once('playerId', ({playerId}) => {
	local_id = playerId;
});

// TURN
socket.on('turn', () => {
	playSound('turn');
	unblock();
});

// STOPWATCH PERMITS
socket.on('stopWatchPermits', () => {
	const STOPWATCH = document.getElementById('STOPWATCH');
	STOPWATCH.setAttribute('data-stopwatch-permits', 'true');
	STOPWATCH.onclick = () => {
		STOPWATCH.onclick =  null;
		socket.emit('startTimerReq', room);
	};
});

// START TIMER
socket.on('startTimer', () => {
	startTimer();
});

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
	let card_name = fileNameParse(card.name);
	let imgFile = `${card_name}-min.jpg`;
	let src = `../img/cards/Rule/${imgFile}`;

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
	<div class="card pointer" id="rule_pick1" onclick="selectRule(1,'${card.name}');" style="background-image:${rule1};"></div>
	<div class="card pointer" id="rule_pick2" onclick="selectRule(2,'${card.name}');" style="background-image:${rule2};margin-left:12px;"></div>
</div>
<div class="group last">
	<button class="button disabled" id="rule_pickBtn" disabled>Replace!</button>
</div>`);
});

// REPLACE RULE
socket.on('ruleReplaced', ({num, card}) => {
	replaceRule(num, card);
});

// STATE ATTACHED
socket.on('stateAttached', ({ card, id }) => {
	stateCardAlert(card, id);
});

// SPECIAL CARD USED
socket.on('specialCardUsed', ({ playerOrig, playerTarg, specialCard }) => {	
	var msg;
	
	if (!playerTarg) {
		msg = `${playerOrig.nickname} used a special card!`;
	}
	else {
		msg =`${playerOrig.nickname} used a special card on ${playerTarg.nickname}!`;
	}
	console.log(playerOrig, playerTarg, specialCard);
	playerAlert(`
	<h1 class="group" style="text-align:center;">${msg}</h1>
	<div class="card group" style="background-image:url('../img/cards/Special/${fileNameParse(specialCard)}-min.jpg'); margin:0 auto;"></div>
	<button class="button bg-blue shadow" onclick="closeAlert('specialCardUsed')">Ok</button>
	`, 'specialCardUsed');
});

// EVERYONE DRINKS
socket.on('everyoneDrinks', () => {
	const ROOT = document.getElementById('ROOT');
	animate(ROOT, 'shake');
	playerAlert(`
<div class="group">
	<h1 class="animated shake" style="font-size: 60px;">EVERYONE DRINKS!!</h1>
</div>
<button class="button bg-blue shadow" onclick="closeAlert('drinkAlert')">Continue</button>
	`,
	'drinkAlert');
});

// PLAYER DRANK
socket.on('playerDrank', ({ player, drinks }) => {
	iDrankAlert({ player, drinks });
});

// LOSER
socket.on('loser', () => {
	socket.emit('loserMsgReq', room);
});

// LOSER MESSAGE
socket.on('loserMsg', loser => {
	// REMOVE ALL MODALS
	let modals = document.querySelectorAll('.modal');
	for (let m of modals) {
		m.parentNode.removeChild(m);
	}
	animate(document.querySelector('body'), 'shake');

	let func1 = loser.id === local_id ? 'onclick="selectLoserCard(1)"' : '';
	let func2 = loser.id === local_id ? 'onclick="selectLoserCard(2)"' : '';
	let func3 = loser.id === local_id ? 'onclick="selectLoserCard(3)"' : '';

	let pointer = loser.id === local_id ? ' pointer' : '';
	playerAlert(`
<div class="group" id="looser_text">
	<h1 style="font-size: 2.5em">Time's up!!!</h1>
	<p>
		<span style="font-size:1.6em;">${loser.nickname}</span> has had <span style="font-size:1.6em;">${loser.drinks} drinks</span> and is the loser
		(all point and laugh, lol!)<br>
	</p>
	<p>
		The loser must know pick one of the final forfeits to do from the cards below:
	</p>
</div>
<div class="loserPick">
	<div class="card back${pointer}" data-card-loser="1" ${func1}"></div>
	<div class="card back${pointer}" data-card-loser="2" ${func2}"></div>
	<div class="card back${pointer}" data-card-loser="3" ${func3}"></div>
</div>
	`);
});

socket.on('showLoserCard', ({num, loser_card}) => {
	const loserCards = document.querySelectorAll('.loserPick .card');
	for (let card of loserCards) {
		if (card.getAttribute('data-card-loser') == num.toString()) {
			card.style.backgroundImage = `url('../img/forfeit/${loser_card.name}.jpg')`;
			animate(card, 'flip', () => {
				card.classList.remove('pointer');
				card.style.margin = '0 auto';
				card.classList.add('bigger');
				animate(card, 'tada');
				const text = document.getElementById('looser_text');
				text.innerHTML = `
				<h1>${loser_card.text}</h1>
				`;
			});
		}
		else {
			animate(card, 'fadeOut', () => {
				card.classList.add('hidden');
			});
		}
	}
	setTimeout(() => {
		// END OF GAME
		let modals = document.querySelectorAll('.modal');
		for (let m of modals) {
			m.parentNode.removeChild(m);
		}		
		playerAlert(`
<div id="CREDITS">
	<div>
		<img src="img/game.jpg">
	</div>
	<div class="mw">
		<h1>That's all folks!</h1>
		<p class="group">
			Thanks for playing! If you enjoyed the game you will love our full card game
			with 200 cards and extra mechanics available <a href="http://www.google.com" target="_blank" class="styled">here</a>!<br>
			We also have some great merch :)
		</p>
		<p class="group">
			This game online game was free!<br>
			Please support the creatorts by buying them a drink or 3.
		</p>
		<p class="group">
			Original game by Felix Mulder <a href="" class="styled donate">(donate)</a><br>
			Illustrations & art by Kimbo Gruff <a href="" class="styled donate">(donate)</a><br>
			Online game development by Jury & Serena Paget <a href="" class="styled donate">(donate)</a>
		</p>
		<div>
			<a class="button bg-blue shadow" href="index.html">Play again</a>
			<a class="button bg-blue shadow" href="index.html">Shop</a>
		</div>
	</div>
</div>
	`);
	}, 10000);
});

/*

	-- FUNCTIONS --

*/

// TOGGLE GAME RULES
function toggleHelp() {
	const GAME_RULES = document.querySelectorAll('.instructions');
	for (let gameRule of GAME_RULES) {
		if (gameRule.classList.contains('hidden')) {
			gameRule.classList.remove('hidden');
			animate(gameRule, 'bounceIn');
		}
		else {
			animate(gameRule, 'zoomOut', () => gameRule.classList.add('hidden'), 'faster');
		}
	}
}

// REMOVE RULES
function removeRules() {
	let rules = document.querySelectorAll('.rule_holder .card');
	for (let rule of rules) {
		rule.parentNode.removeChild(rule);
	}
}

// TOGGLE SOUND
function toggleSound(e) {
	SETTINGS.sound = SETTINGS.sound === true ? false : true;
	let attr = SETTINGS.sound ? 'on' : 'off';
	e.target.setAttribute('data-sound', attr);
}

// UNBLOCK GAME
function unblock() {
	animate(TOP_CARD_IN_STACK, 'wobble', () => {
		TOP_CARD_IN_STACK.classList.add('clickable');
		TOP_CARD_IN_STACK.onclick = requestCard;
	});

	// REQUEST CARD
	function requestCard(e) {
		if (firstMove) {
			firstMove = false;
			socket.emit('startTimerReq', room);
		}

		TOP_CARD_IN_STACK.onclick = null;
		TOP_CARD_IN_STACK.classList.remove('clickable');
		ANIMLOG.value = 'false';
		socket.emit('drawCard', room);
	}	
}

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
function animate(elem, animationName, callback, speed='fast') {
	SETTINGS.animating = true;
	//speed = 'faster';

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

// PLAY SOUND
function playSound(file) {
	if (SETTINGS.sound) {
		let sound = new Audio(`../sounds/${file}.mp3`);
		sound.play();
	}
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
		let moderator_tag = player.moderator ? `<span class="moderator">Moderator</span>` : '';
		let turn_class = player.turn ? 'active' : '';

		var weakness = '';
		var power    = '';
		var special  = '';
		var cardName = '';
		var func     = 'onclick="zoomCard(this)"';

		if (player.stateCards.weakness.length > 0) {
			for (let wkns of player.stateCards.weakness) {
				let stolen = '';
				if (stateCard && stateCard.stolen && wkns === stateCard.name) {
					stolen = 'data-card-stolen="true"';
				}
				cardName = fileNameParse(wkns);
				weakness += `
				<div ${func} class="card" ${stolen} data-state-type="Weakness" data-card-name="${wkns}" style="background-image: url('../img/cards/Weakness/${cardName}-min.jpg');"></div>`;
			}
		}

		if (player.stateCards.power.length > 0) {
			for (let pwr of player.stateCards.power) {
				let stolen = '';
				if (stateCard && stateCard.stolen && pwr === stateCard.name) {
					stolen = 'data-card-stolen="true"';
				}
				cardName = fileNameParse(pwr);
				power += `
				<div ${func} class="card" ${stolen} data-state-type="Power" data-card-name="${pwr}" style="background-image: url('../img/cards/Power/${cardName}-min.jpg');"></div>`;
			}
		}

		if (player.specialCards.length > 0) {
			for (let spcl of player.specialCards) {
				cardName = fileNameParse(spcl);
				let file = player.id === local_id ? `/Special/${cardName}` : `_secret`;
				let attachedTo = `data-attached-to="${player.id}"`;
				special += `
				<div ${func} class="card" data-state-type="Special" data-card-name="${spcl}" ${attachedTo} style="background-image: url('../img/cards/${file}-min.jpg?v=3');"></div>
				`;
			}
		}

		PLAYERS_LIST.innerHTML += `
		<li class="player ${turn_class}">
			${moderator_tag}
			<div class="avatar av${player.avatar}"></div>
			<span class="nickname">${player.nickname}</span>
			<span class="drinks">(${player.drinks} drinks)</span>
			<div class="state_cards">
				${weakness}
				${power}
				${special}
			</div>
		</li>`;
	}
}

// DRAW CARD
function drawCard(card) {
	if(card){
	playSound('card_draw');

	animate(TOP_CARD_IN_STACK, 'hinge', () => {
		ANIMLOG.onchange = () => {
					requestNextPlayer();
					ANIMLOG.onchange = null;	
		};
		switch(card.type) {

			case 'Action':
				socket.emit('actionCard', { card, room });		
				break;

			case 'Rule':
				if (document.querySelectorAll('.rule_holder .card').length === 2) {
					socket.emit('mustReplaceRule', { card, room });
				}
				else {
					socket.emit('placeRule', { card, room });
				}
				break;

			case 'Power':
			case 'Weakness':
			case 'Special':
				socket.emit('stateCard', { card, room, local_id });
				break;
		}
	});
	}
}

// DISCARD CARD
function discard(card) {
	const HOLDER = document.getElementById('DISCARDED_CARDS');
	var top;
	var left;

	if (HOLDER.childNodes.length === 0) {
		top = 0;
		left = 0;
	}
	else {
		let previousCard = HOLDER.childNodes[HOLDER.childNodes.length - 1];

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

	playSound('card_wiggle');

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
	    div.setAttribute('data-card-name', card.name);
	const RULE_HOLDERS = document.getElementsByClassName('rule_holder');
	
	let holder1_empty = (document.querySelector('.rule_holder .card')) ? false : true;
	let holder2_empty = (document.querySelector('.rule_holder:nth-child(2) .card')) ? false : true;

	if (holder1_empty && holder2_empty) {
		RULE_HOLDERS[0].appendChild(div);
	}
	else {
		if (!holder1_empty && holder2_empty) {
			RULE_HOLDERS[1].appendChild(div);
		}
	}

	playSound('card_wiggle');

	animate(div, 'tada', () => {
		ANIMLOG.value = 'false';
		if (ANIMLOG.onchange) {
			ANIMLOG.onchange();
		}
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
function replaceRule(num, cardName) {
	let idx = num - 1;

	let old_rule = document.querySelectorAll('.rule_holder .card')[idx];
	    old_rule.parentNode.removeChild(old_rule);

	let newCard = document.createElement('div');
		newCard.classList.add('card');
		newCard.style.backgroundImage = `url(\'../img/cards/Rule/${fileNameParse(cardName)}-min.jpg\')`;
		newCard.setAttribute('data-card-name', cardName);

	let rule_holder = document.querySelectorAll('.rule_holder')[idx];
		rule_holder.appendChild(newCard);

	playSound('card_wiggle');
	
	animate(newCard, 'tada', () => {
		ANIMLOG.value = 'false';
		if (ANIMLOG.onchange) {
			ANIMLOG.onchange();
		}
		socket.emit('animationOverReq');
	});
}

// USE LATER
function useLater(next) {
	closeAlert('playerAlert');
	if (next === true) requestNextPlayer();
}

// PLAYER ALERT
function playerAlert(content, type = 'playerAlert') {
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
function stateCardAlert(card, id) {
	let modal = document.createElement('div');
		modal.classList.add('modal', 'full-height', 'stateAlert');
	APP.appendChild(modal);

	let innerModal = document.createElement('div');
		innerModal.classList.add('full-height', 'content-centered');
	modal.appendChild(innerModal);

	let splat = document.createElement('div');
		splat.classList.add('full-height', 'splat', card.type.toLowerCase());
	innerModal.appendChild(splat);

	let fileName = fileNameParse(card.name);
	let src = `'../img/cards/${card.type}/${fileName}-min.jpg'`;
	if (card.type === 'Special' && id !== local_id) {
		src = '../img/cards/_secret-min.jpg';
	}

	let _card = document.createElement('div');
		_card.classList.add('card', 'bigger');
		_card.style.backgroundImage = `url(${src})`;
	innerModal.appendChild(_card);

	var soundFile = card.type.toLowerCase();
	playSound(soundFile);
	
	animate(splat, 'rubberBand');
	animate(innerModal, 'tada', () => {
		setTimeout(() => {
			animate(modal, 'fadeOut', function() {
				closeAlert('stateAlert');
				const attached_card = document.querySelector(`.card[data-card-name="${card.name}"]`);
				animate(attached_card, 'flip', () => {
					ANIMLOG.value = 'false';
					if (ANIMLOG.onchange) {
						ANIMLOG.onchange();
					}
					socket.emit('animationOverReq');
				}, 'faster');
				});
		}, 0/*5000*/);
	});
}

// ZOOM CARD
function zoomCard(card) {
	let cardName = card.getAttribute('data-card-name');
	let cardType = card.getAttribute('data-state-type');
	var attachedTo = null;
	var url = `'../img/cards/${cardType}/${fileNameParse(cardName)}-min.jpg'`;
	var content = '';
	if (cardType !== 'Special') {
		content = `
		<div class="group">
			<div class="card bigger" style="background-image: url(${url})";></div>
		</div>
		<button class="button bg-blue shadow" onclick="closeAlert('zoomAlert')">Close</button>
		`;
	}
	else {
		attachedTo = card.getAttribute('data-attached-to');
		if (attachedTo !== local_id) {
			url = `'../img/cards/_secret-min.jpg'`;
			content = `
	 		<div style="display:flex;justify-content:center;align-items:center;">
	 			<div class="card bigger" style="background-image: url(${url})";></div>
	 			<div style="margin-left: 25px; max-width:264px;">
		 			<p class="group">
		 				This is a special card.
	 					Only the one who drew it can see it and use it once at any point.
		 			</p>
	 				<button class="button bg-blue shadow" onclick="closeAlert('zoomAlert')">Close</button>
	 			</div>
	 		</div>
			`;
		}
		else {
			content = `
	 		<div style="display:flex;justify-content:center;align-items:center;" id="specialMsg">
	 			<div class="card bigger" style="background-image: url(${url})";></div>
	 			<div style="margin-left: 25px; max-width:264px;">
		 			<p class="group">
		 				This is a special card.
		 				It's kept secret from other players and you can use it once at any point.
		 			</p>
	 				<button class="button bg-blue shadow" onclick="useCard('${cardName}');">Use now</button>
					<button class="button bg-blue shadow" onclick="closeAlert('zoomAlert')">Use later</button>
	 			</div>
	 		</div>
			`;
		}
	}
	playerAlert(content, 'zoomAlert');
}
function selectCardToSteal(card, targetPlayer, cardType, specialCard) {

	const STEALBTN = document.getElementById('stealBTN');
	var emitMsg = stealBTN.getAttribute('data-action');
	// let cardName = card.getAttribute('data-card-name');

	if (card.classList.contains('myCard')) {
		let mySelectedCards = document.querySelectorAll('.selected.myCard');
		if (mySelectedCards) {
			for (let s of mySelectedCards) {
				s.classList.remove('selected');
			}
		}
	}
	else {
		let selectedCards = document.querySelectorAll('.selected.enemy');
		if (selectedCards) {
			for (let s of selectedCards) {
				s.classList.remove('selected');
			}
		}
	}
	card.classList.add('selected');

	if (document.querySelector('.selected.myCard') && document.querySelector('.selected.enemy')) {
		enableButton();
	}
	else {
		if (!document.querySelector('.myCard') && document.querySelector('.selected.enemy')) {
			enableButton();
		}
	}

	function enableButton() {
		STEALBTN.classList.remove('disabled');
		STEALBTN.onclick = () => {
			let myCard = document.querySelector('.selected.myCard');
			let enemyCard = document.querySelector('.selected.enemy');
			//let emitMsg = enemyCard.getAttribute('data-action');
			let cardName = enemyCard.getAttribute('data-card-name');
			let myCardName = null;
			let myCardType = null;
			
			if (myCard) {
				myCardName = myCard.getAttribute('data-card-name');
				myCardType = myCard.getAttribute('data-card-type');
			}

			socket.emit(emitMsg, { targetPlayer, cardName, cardType, specialCard, myCardName, myCardType});
			closeAlert('specialMsg');
		};
	}
}
// USE CARD
function useCard(cardName) {

	socket.emit('useCardReq', {
		card: cardName,
		player: local_id,
		room
	});
}

socket.on('useCardResp', response => {

		var content = '';

		content += '<div style="max-height: 70vh; max-width: 70vw; overflow-y: auto;">';
		content += `<h2>${response.heading}</h2>`;
		if (response.action === 'steal') {
			
			for (let p of response.target_players) {
				content += '<div class="playerToSteal">';
				let cards = '';
				content += `<p>${p.nickname}</p>`;
				content += `<div class="cardsToSteal">`;

				for (let tCard of p.stateCards[response.target_cards.toLowerCase()]) {
					cards += `<div class="card pointer enemy"
					style="background-image: url('../img/cards/${response.target_cards}/${fileNameParse(tCard)}-min.jpg');"
					onclick="selectCardToSteal(this, '${p.id}', '${response.target_cards.toLowerCase()}', '${tCard}');"
					data-card-name="${tCard}"
					data-card-type="${response.target_cards}"
					></div>`;
				}
				
				content += cards;
				content += '</div>';
			}
			content += '</div>';
			content += '</div>';
			content += `
			<div class="buttons">
				<button class="button bg-blue shadow disabled" id="stealBTN" data-action="${response.action}">${response.button}</button>
				<button class="button bg-blue shadow" onclick="closeAlert('specialMsg')">Cancel</button>
			</div>
			`;
			
			closeAlert('zoomAlert');
			playerAlert(content, 'specialMsg');
			return;
		}

		if (response.action === 'remove') {
			var ruleCardsAdded = false;
			for (let p of response.target_players) {
				content += '<div class="playerToSteal">';
				content += `<p>${p.nickname}</p>`;
				content += `<div class="cardsToSteal">`;
				
				
				let cards = '';
				for (let tCard of p.stateCards[response.target_cards.toLowerCase()]) {
				cards += `
				<div class="card pointer enemy"
				style="background-image: url('../img/cards/${response.target_cards}/${fileNameParse(tCard)}-min.jpg');"
				onclick="selectCardToSteal(this, '${p.id}', '${response.target_cards.toLowerCase()}', '${response.card}');"
				data-card-name="${tCard}"
				data-card-type="${response.target_cards}"
				></div>`;
				}
				// }
				
				content += cards;
				content += '</div>';
			}
			content += '</div>';
			content += '</div>';
			content += `
			<div class="buttons">
				<button class="button bg-blue shadow disabled" id="stealBTN" data-action="${response.action}">${response.button}</button>
				<button class="button bg-blue shadow" onclick="closeAlert('specialMsg')">Cancel</button>
			</div>
			`;
			
			closeAlert('zoomAlert');
			playerAlert(content, 'specialMsg');
			return;
		}
		if (response.action === 'swap') {
			content += `
			<div class="playerToSteal">
				<p>${response.myself.nickname} (you)</p>
				<div class="cardsToSteal">
			`;

			for (let mCard of response.myself.stateCards[response.myself_cards.toLowerCase()]) {
				content +=`
					<div class="card pointer myCard"
					style="background-image:url('../img/cards/${response.myself_cards}/${fileNameParse(mCard)}-min.jpg');"
					onclick="selectCardToSteal(this, '${response.myself.id}', '${response.myself_cards.toLowerCase()}', '${response.card}');"
					data-card-name="${mCard}"
					data-card-type="${response.myself_cards}"
					></div>
				`;
			}
			content += `
				</div>
			</div>
			`;
			for (let p of response.target_players) {
				content += '<div class="playerToSteal">';
				let cards = '';
				content += `<p>${p.nickname}</p>`;
				content += `<div class="cardsToSteal">`;
				
				for (let tCard of p.stateCards[response.target_cards.toLowerCase()]) {
					cards += `<div class="card pointer enemy"
					style="background-image: url('../img/cards/${response.target_cards}/${fileNameParse(tCard)}-min.jpg');"
					onclick="selectCardToSteal(this, '${p.id}', '${response.target_cards.toLowerCase()}', '${response.card}');"
					data-card-name="${tCard}"
					data-card-type="${response.target_cards}"
					></div>`;
				}
				
				
				content += cards;
				content += '</div>';
			}
			content += '</div>';
			content += '</div>';
			content += `
			<div class="buttons">
				<button class="button bg-blue shadow disabled" id="stealBTN" data-action="${response.action}">${response.button}</button>
				<button class="button bg-blue shadow" onclick="closeAlert('specialMsg')">Cancel</button>
			</div>
			`;
			
			closeAlert('zoomAlert');
			playerAlert(content, 'specialMsg');
			return;
		}
		if (response.action === 'anarchy') {
			closeAlert('zoomAlert');
			socket.emit('anarchy', response.card);
			return;
		}

		if (response.action === 'expelliarmus') {

			let ruleCards = document.querySelectorAll('.rule_holder .card');
			if (ruleCards.length !== 0) {
				content += `
				<div class="playerToSteal">
				<p>Rules:</p>
				`;
				
				content += '<div class="cardsToSteal">'
				for (let ruleC of ruleCards) {
					content += `
					<div
					class="card pointer enemy"
					data-card-type="Rule"
					onclick="selectCardToSteal(this, null, 'Rule', '${response.card}')"
					style="background-image:url('../img/cards/Rule/${fileNameParse(ruleC.getAttribute('data-card-name'))}-min.jpg');"
					data-card-name="${ruleC.getAttribute('data-card-name')}",
					
					></div>
					`;
				}
				content += '</div></div>';
			}
			
			for (let p of response.target_players) {
				let nick = p.id === local_id ? p.nickname + '(you)' : p.nickname
				content += `
				<div class="playerToSteal">
				<p>${nick}:</p>
				<div class="cardsToSteal">
					
				`;
				for (let powerCard of p.stateCards.power) {
					content += `
					<div
					class="card pointer enemy"
					data-card-type="Power"
					onclick="selectCardToSteal(this, '${p.id}', 'power', '${response.card}')"
					data-card-name="${powerCard}",
					style="background-image:url('../img/cards/Power/${fileNameParse(powerCard)}-min.jpg')"
					></div>`;
				}
				for (let weakCard of p.stateCards.weakness) {
					content += `
					<div
					class="card pointer enemy"
					data-card-type="Weakness"
					onclick="selectCardToSteal(this, '${p.id}', 'weakness', '${response.card}')"
					data-card-name="${weakCard}",
					style="background-image:url('../img/cards/Weakness/${fileNameParse(weakCard)}-min.jpg')"
					></div>`;
				}
				content += `
				</div></div>`;
			}
			content += `</div>`;
			content += `
			<div class="buttons">
				<button class="button bg-blue shadow disabled" id="stealBTN" data-action="${response.action}">${response.button}</button>
				<button class="button bg-blue shadow" onclick="closeAlert('specialMsg')">Cancel</button>
			</div>
			`;
			

			closeAlert('zoomAlert');
			playerAlert(content, 'specialMsg');
			return;
		}
		if (response.action === 'show') {
			closeAlert('zoomAlert');
			socket.emit('showSpecialReq', response.card);
			return;
		}
	});

// CLOSE ALERT
function closeAlert(type) {
	let msgbox = document.querySelector(`.modal.${type}>div`);
		msgbox.innerHTML = '';

	let modal = document.querySelector(`.modal.${type}`);
		modal.innerHTML =  '';
		modal.parentNode.removeChild(modal);
}
// 1800
function startTimer(time=1800) {
	const STOPWATCH = document.getElementById('STOPWATCH');
	STOPWATCH.onclick = null;
	firstMove = false;
	STOPWATCH.setAttribute('data-stopwatch-permits', 'false');
	animate(STOPWATCH, 'flash');
	const COUNTER = document.querySelector('#STOPWATCH span');
		  COUNTER.innerHTML = '30:00';
		  time--;

	const COUNTDOWN = setInterval(() => {
		var minutes = Math.floor(time / 60);
		var seconds = time % 60;

		seconds = seconds < 10 ? '0' + seconds : seconds;
		COUNTER.innerHTML = `${minutes}:${seconds}`;

		if (time === 905) {
			COUNTER.classList.add('blink');
			animate(STOPWATCH, 'flash');
			playSound('5_sec_countd');
			setTimeout(() => {
				COUNTER.classList.remove('blink');
				animate(document.querySelector('body'), 'shake');
				playerAlert(`
				<div class="group">
					<h1 class="animated shake" style="font-size: 60px;">EVERYONE DRINKS!!</h1>
				</div>
				<button class="button bg-blue shadow" onclick="closeAlert('drinkAlert')">Continue</button>
				`,
				'drinkAlert');
			}, 5000);
		}

		if (time === 5) {
			COUNTER.classList.add('blink');
			animate(STOPWATCH, 'flash');
			playSound('5_sec_countd');
			setTimeout(() => {
				clearInterval(COUNTDOWN);
				socket.emit('endGameReq', room);
			}, 5000);
		}
		time--;
	}, 1000);
}

// I DRANK
function iDrank() {
	IDRANK_BTN.classList.add('clicked');
	setTimeout(() => {
		IDRANK_BTN.classList.remove('clicked');
	}, 150);
	socket.emit('iDrank');
}

// I DRANK ALERT
function iDrankAlert({player, drinks}) {
	playSound('drank');
	let xDrinks = drinks === 1 ? `${drinks} drink` : `${drinks} drinks`;
	let msg = document.createElement('p');
		msg.classList.add('iDrankMsg');
		msg.innerHTML = `${player} has had ${xDrinks}`;
	APP.appendChild(msg);
	animate(msg, 'slideOutUp', () => {
		msg.parentNode.removeChild(msg);
	}, 'slower');
}

// SELECT LOSER CARD
function selectLoserCard(num) {
	socket.emit('loserCardSelected', num);
}