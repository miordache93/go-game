# Testing Multiplayer Go Game

## Servers Running:
- **PartyKit Server**: http://localhost:1999
- **Frontend App**: http://localhost:4200

## Test Steps:

1. **Open first player**: 
   - Go to http://localhost:4200
   - Click "Switch to Multiplayer"
   - Enter name: "Player 1"
   - Leave room ID empty (will generate one)
   - Click "Join Game"
   - Note the room ID shown

2. **Open second player** (in another browser/incognito):
   - Go to http://localhost:4200
   - Click "Switch to Multiplayer"  
   - Enter name: "Player 2"
   - Enter the same room ID from Player 1
   - Click "Join Game"

3. **Test gameplay**:
   - Player 1 should be assigned Black
   - Player 2 should be assigned White
   - Black player makes first move
   - Moves should sync between both players
   - Test pass, resign, and scoring features

## Direct Room Link:
You can also join directly with URL params:
- http://localhost:4200?room=test-room&name=Player1
- http://localhost:4200?room=test-room&name=Player2