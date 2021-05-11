import '../css/App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import {Col, Dropdown, DropdownButton, Row} from 'react-bootstrap';
import Card from 'react-bootstrap/Card';
import React from 'react';
import {Redirect} from "react-router-dom";
import NetworkedPage from "../utility/NetworkedPage";
import ProgressBar from "react-bootstrap/ProgressBar";
import ButtonOrWait from "../Component/ButtonOrWait";

class MatchDropdown extends React.Component {
    constructor(props) {
        super(props);
        this.correctPlayer = props.pair[0];
        this.correctPlayerAnswer = props.pair[1];
        this.matchPairList = props.matchPairList;
        this.callback = props.callback;
        this.callback = this.callback.bind(this);

        this.setBtnRef = element => {
            this.btnRef = element;
        }
    }

    LocalHandleDropdownSelect(chosenPlayerPair) {
        this.props.callback(this.correctPlayer, this.correctPlayerAnswer, chosenPlayerPair[0], chosenPlayerPair[1]);
        //TODO ^
        console.log("Yeet")
        console.log(this.btnRef.getElementsByTagName("button")[0]);
        this.btnRef.getElementsByTagName("button")[0].innerHTML = chosenPlayerPair[0];
    }

    GetDropdown() {
        let playerList = [];
        for (let chosenPlayerPair of this.matchPairList) {
            playerList.push(
                <Dropdown.Item onClick={() => this.LocalHandleDropdownSelect(chosenPlayerPair)}>
                    {chosenPlayerPair[0]}
                </Dropdown.Item>
            );
        }
        return (
            <DropdownButton title={"Guess author..."} ref={this.setBtnRef}>
                {playerList}
            </DropdownButton>
        );
    }

    render() {
        return(this.GetDropdown());
    }
}

class MatchRow extends React.Component {
    constructor(props) {
        super(props);
        this.pair = props.pair;
        this.matchPairList = props.matchPairList;
        this.callback = props.callback;
    }

    render() {
        return (
            // Row of an answer + a dropdown of all players
            <Row>
                <Col>{this.pair[1]}</Col>
                <Col><MatchDropdown pair={this.pair} matchPairList={this.matchPairList} callback={this.callback}/></Col>
            </Row>
        );
    }
}

class QuestionMatch extends NetworkedPage {

    constructor(props) {
        super(props);
        this.HandleSubmit = this.HandleSubmit.bind(this);
        this.HandleDropdownSelect = this.HandleDropdownSelect.bind(this);
        this.state = {
            matchPairList: this.ConvertNameAnswerPairsStrToList(),
            matches: {}
        }
    }

    componentWillMount() {
        this.ConnectToWebsocket(
            this.props.location.state.url,
            this.props.location.state.id,
            this.props.location.state.name
        );
        this.socket.send("REQUESTTIMER");
        this.setState({
            timerSeconds: this.GetTimerSeconds(),
            timerPercent: this.GetTimerPercent()
        })
    }

    //Durstenfeld Shuffle
    //https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
    ShuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    RespondToSocketMessages(e) {
        if(this.socket === undefined) return;
        super.RespondToSocketMessages(e);

        console.log(e.data);

        const transitionToGameMessage = "TRANSITION SCORE";

        if (e.data.startsWith(transitionToGameMessage)) {
            console.log("Transitioning to score screen");
            this.setState({redirect: true});
            return;
        }

        const timerMessage = "TIMER ";
        if (e.data.startsWith(timerMessage)) {
            let timer = e.data.substr(timerMessage.length);
            console.log("Got timer data " + timer);
            let startAndEnd = timer.split(";").map(x=>parseInt(x));
            this.setState({
                timerStart: startAndEnd[0],
                timerEnd: startAndEnd[1]
            });
            requestAnimationFrame(()=>this.TimerHandler());
        }
    }

    TimerHandler() {
        this.setState({
            timerSeconds: this.GetTimerSeconds(),
            timerPercent: this.GetTimerPercent()
        })
        if(this.state.timerEnd - new Date().getTime() > 0)
            requestAnimationFrame(()=>this.TimerHandler()); // We're using requestAnimationFrame so this runs at the apps framerate
    }

    GetTimerSeconds() {
        if(this.state.timerStart && this.state.timerEnd) {
            return Math.max(Math.floor((this.state.timerEnd - new Date().getTime())/1000), 0);
        }
        return 0;
    }
    GetTimerPercent() {
        if(this.state.timerStart && this.state.timerEnd) {
            let elapsed = this.state.timerEnd - new Date().getTime();
            let percent = elapsed / (this.state.timerEnd - this.state.timerStart);
            return Math.min(Math.max(percent * 100, 0), 100);
        }
        return 100;
    }

    ConvertNameAnswerPairsStrToList() {
        let pairStrList = this.props.location.state.matchPairStr.split(';');
        let pairList = [];
        for (let pStr of pairStrList) {
            pairList.push(pStr.split(','));
        }
        return pairList;
    }

    ConvertMatchesToStr() {
        let matchesList = [];
        for (let key in this.state.matches) {
            if (this.state.matches.hasOwnProperty(key)) {
                matchesList.push(this.state.matches[key].join(','));
            }
        }
        return matchesList.join(';')
    }


    HandleSubmit() {
        this.doneAnswering = true;
        const playerMatches = this.ConvertMatchesToStr();
        this.socket.send("DONEMATCHING " + playerMatches);
    }

    HandleDropdownSelect(correctPlayer, correctPlayerAnswer, guessedPlayer, guessedPlayerAnswer) {
        console.log("Chosen player: ", guessedPlayer + "\nCorrect player: ", correctPlayer);
        let newMatches = this.state.matches;
        newMatches[[correctPlayer, correctPlayerAnswer].join("-->")] = [correctPlayer, correctPlayerAnswer, guessedPlayer, guessedPlayerAnswer];
        this.setState( {
            matches: newMatches
        });
    }

    render(){
        if (this.state.redirect) {
            this.CloseNetworkedPage();
            console.log("Transition to Scores");
            return (
                <Redirect to={{
                    pathname: "/scores",
                    state: {
                        id: this.props.location.state.id,
                        roomCode: this.props.location.state.roomCode,
                        name: this.props.location.state.name,
                        url: this.props.location.state.url,
                        question: this.props.location.state.question,
                    }
                }} />
            )
        } else {
            if(this.options === undefined) {
                console.log("Player Answers: " + this.state.matchPairList);

                this.options = [];
                for(let pair of this.state.matchPairList) {
                    this.options.push(
                        <MatchRow pair={pair} matchPairList={this.state.matchPairList} callback={this.HandleDropdownSelect}/>);
                }
                this.ShuffleArray(this.options);
            }
            return (
                <div className="questionmatch">

                    <header className="App-header">
                        <div className= "mb-2">
                            <h1>Round 1</h1>

                            <br />
                            <Card border="primary" bg="light" text = "dark">
                                <Card.Body>{this.props.location.state.question}</Card.Body>
                            </Card>

                            <br />
                            <h4>Match each answer to a player!</h4>

                            <Card text = "dark" style={{ width: '30rem' }}>
                                {this.options}
                            </Card>

                            <ProgressBar now={this.state.timerPercent} label={`${this.state.timerSeconds} secs left!`}/>
                            <ButtonOrWait label={"Submit Answer"} switchToWait={this.doneAnswering} callback={()=>this.HandleSubmit()}/>
                        </div>
                    </header>
                </div>
            );

        }
    }
}

export default QuestionMatch;

