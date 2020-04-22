const PLAYERS = [];


function playerJoin(id, nickname, room, avatar) {
	const player = {id, nickname, room, avatar};
	const room_players = getRoomPlayers(room);

	player.moderator = room_players.length === 0 ? true : false;
	player.turn = player.moderator ? true : false;

	player.stateCards = {
		power: [],
		weakness: []
	};

	player.specialCards = [];

	player.drinks = 0;

	PLAYERS.push(player);

	return player;
}


function getCurrentPlayer(id) {
	return PLAYERS.find(player => player.id === id);
}


function playerLeave(id) {
	const index = PLAYERS.findIndex(player => player.id === id);
	if (index !== -1) {

		const player_leaving = PLAYERS[index];
		if (player_leaving.moderator) {
			const next_player = getRoomPlayers(player_leaving.room)[1];
			if (next_player) next_player.moderator = true;
		}

		if (player_leaving.turn) {
			const next_player = getRoomPlayers(player_leaving.room)[1];
			if (next_player) next_player.turn = true;
		}

		PLAYERS.splice(index, 1)[0];
	}
}


function getRoomPlayers(room) {
	return PLAYERS.filter(player => player.room === room);
}


function getRoomModerator(room) {
	return PLAYERS.filter(player => player.room === room && player.turn === true);
}


function nextPlayer(id) {
	let currentPlayer = getCurrentPlayer(id);
	let room = getRoomPlayers(currentPlayer.room);

	let currentPlayer_index = room.findIndex(player => player.id === currentPlayer.id);
	let nextPlayer_index    = (currentPlayer_index ===  room.length - 1) ? 0 : currentPlayer_index + 1;

	let nextPlayer = room[nextPlayer_index];

	let currentPlayer_globalIndex = PLAYERS.findIndex(player => player.id === currentPlayer.id);
	let nextPlayer_globalIndex    = PLAYERS.findIndex(player => player.id === nextPlayer.id);

	PLAYERS[currentPlayer_globalIndex].turn = false;
	PLAYERS[nextPlayer_globalIndex].turn    = true;

	return PLAYERS[nextPlayer_globalIndex].id;
}


function attachCard(room, id, card) {
	const room_players = getRoomPlayers(room);
	const index = room_players.findIndex(player => player.id === id);
	if (index !== -1) {	
		const player = room_players[index];

		switch(card.type) {

			case 'Weakness':
				if (player.stateCards.weakness.length == 2) {
					player.stateCards.weakness.shift();
				}
				player.stateCards.weakness.push(card.name);
				break;

			case 'Power':
				player.stateCards.power.push(card.name);
				break;

			case 'Special':
				player.specialCards.push(card.name);
				break;
		}
	}
}


function getRoomLoser(room) {
	const room_players = getRoomPlayers(room);
	room_players.sort( (a, b) => {
		if (a.drinks < b.drinks) {
			return 1;
		}
		if (a.drink > b.drinks) {
			return -1;
		}
		return 0;
	});
	const loser = room_players[0];
	return loser;
}


function useCardMessage(player, card) {
	const ROOM_PLAYERS = getRoomPlayers(player.room);
	var playersWithPowers = ROOM_PLAYERS.filter(p => p.stateCards.power.length > 0);
	var playersWithWeakness = ROOM_PLAYERS.filter(p => p.stateCards.weakness.length > 0);
	var playersWithStateCards = ROOM_PLAYERS.filter(p => p.stateCards.weakness.length > 0 || p.stateCards.power.length > 0);
	var response;
	switch(card) {
		case '1Up': // Steal a power
			response = {
				action: 'steal',
				target_players: playersWithPowers,
				target_cards: 'Power',
				card,

				heading: 'Steal somebody else\'s power!',
				button: 'Steal!'
			};
			break;

		case 'Disarm': // Remove Power From Someone
			response = {
				action: 'remove',
				target_players: playersWithPowers,
				target_cards: 'Power',
				card,

				heading: 'Remove somebody else\'s power!',
				button: 'Remove!'
			};
			break;

		case 'Friend in Need': // Remove Weakness From Someone
			response = {
				action: 'remove',
				target_players: playersWithWeakness,
				target_cards: 'Weakness',
				card,

				heading: 'Remove somebody else\'s weakness!',
				button: 'Remove!'
			};
			break;

		case 'Paracetamol':
		case 'Medicine':   // Remove One Own Weakness
			response = {
				action: 'remove',
				target_players: [player],
				target_cards: 'Weakness',
				card,

				heading: 'Remove one of your weaknesses!',
				button: 'Remove!'
			};
			break;

		case 'Great Deal!': // Swap Weakness For Power
			response = {
				action: 'swap',
				target_players: playersWithPowers,
				target_cards: 'Power',
				card,

				heading: 'Swap one weakness for one power!',
				button: 'Swap!',

				myself: player,
				myself_cards: 'Weakness'
			};
			break;

		case 'Anarchy': // Remove Everyone's State Cards
			response =  {
				action: 'anarchy',
				card
			};
			break;

		case 'Expelliarmus':
		case 'Sacrificial Altar': // Remove 1 Rule, 1 Power or 1 Weakness
			response =  {
				action: 'expelliarmus',
				target_players: playersWithStateCards,
				target_cards: 'All',
				card,

				heading: 'Remove any of the following cards',
				button: 'Remove!',
			}
			break;

		case 'Deflection': // Display Special Card
		case 'Nope':
		case 'Counter':
		case 'Karma Police':
		case 'Down it!': 
			response = {
				action: 'show',
				card
			};
			break;

	}
	return response;
}


function stealCard(playerOrig, playerTarg, cardName, cardType, specialCard) {
	let playerOrigIdx = PLAYERS.findIndex(p => p.id === playerOrig.id);
	let playerTargIdx = PLAYERS.findIndex(p => p.id === playerTarg.id);
	
	let cardStealIdx = PLAYERS[playerTargIdx].stateCards[cardType].findIndex(c => c == cardName);
	let cardSteal = PLAYERS[playerTargIdx].stateCards[cardType].splice(cardStealIdx, 1)[0];
	PLAYERS[playerOrigIdx].stateCards[cardType].push(cardSteal);

	let specialCardIdx = PLAYERS[playerOrigIdx].specialCards.findIndex(c => c === specialCard);
	PLAYERS[playerOrigIdx].specialCards.splice(specialCardIdx, 1);
}


function removeCard(playerOrig, playerTarg, cardName, cardType, specialCard) {
	let playerOrigIdx = PLAYERS.findIndex(p => p.id === playerOrig.id);
	let playerTargIdx = PLAYERS.findIndex(p => p.id === playerTarg.id);

	let cardRemIdx = PLAYERS[playerTargIdx].stateCards[cardType].findIndex(c => c == cardName);
	let cardRemove = PLAYERS[playerTargIdx].stateCards[cardType].splice(cardRemIdx, 1)[0];

	let specialCardIdx = PLAYERS[playerOrigIdx].specialCards.findIndex(c => c === specialCard);
	PLAYERS[playerOrigIdx].specialCards.splice(specialCardIdx, 1);
}


function swapCard(playerOrig, playerTarg, cardName, cardType, specialCard, myCardName, myCardType) {
	let playerOrigIdx = PLAYERS.findIndex(p => p.id === playerOrig.id);
	let playerTargIdx = PLAYERS.findIndex(p => p.id === playerTarg.id);

	let cardTakeIdx = PLAYERS[playerTargIdx].stateCards[cardType].findIndex(c => c === cardName);
	let cardTake = PLAYERS[playerTargIdx].stateCards[cardType].splice(cardTakeIdx, 1)[0];
	PLAYERS[playerOrigIdx].stateCards[cardType.toLowerCase()].push(cardTake);

	let cardGiveIdx = PLAYERS[playerOrigIdx].stateCards[myCardType.toLowerCase()].findIndex(c => c === myCardName);
	let cardGive = PLAYERS[playerOrigIdx].stateCards[myCardType.toLowerCase()].splice(cardGiveIdx, 1)[0];
	PLAYERS[playerTargIdx].stateCards[myCardType.toLowerCase()].push(cardGive);	

	let specialCardIdx = PLAYERS[playerOrigIdx].specialCards.findIndex(c => c === specialCard);
	PLAYERS[playerOrigIdx].specialCards.splice(specialCardIdx, 1);
}


function resetRoomStateCards(room, specialCard, playerOrig) {
	for (let p of PLAYERS) {
		if (p.room === room) {
			p.stateCards.power = [];
			p.stateCards.weakness = []
		}
	}
	let playerOrigIdx = PLAYERS.findIndex(p => p.id === playerOrig.id);
	let specialCardIdx = PLAYERS[playerOrigIdx].specialCards.findIndex(c => c === specialCard);
	PLAYERS[playerOrigIdx].specialCards.splice(specialCardIdx, 1);

}


function removeRule(player, specialCard) {
	let playerIdx  = PLAYERS.findIndex(p => p.id === player.id);
	let specialIdx = PLAYERS[playerIdx].specialCards.findIndex(c => c === specialCard);
	PLAYERS[playerIdx].specialCards.splice(specialIdx, 1);
}


module.exports = {
	playerJoin,
	getCurrentPlayer,
	playerLeave,
	getRoomPlayers,
	nextPlayer,
	attachCard,
	getRoomModerator,
	getRoomLoser,
	useCardMessage,
	stealCard,
	removeCard,
	swapCard,
	resetRoomStateCards,
	removeRule
};