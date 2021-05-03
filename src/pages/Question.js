import '../css/App.css';
import 'bootstrap/dist/css/bootstrap.min.css'
import {Form} from 'react-bootstrap'
import Card from 'react-bootstrap/Card'
import ProgressBar from 'react-bootstrap/ProgressBar'
import React from 'react';
import NetworkedPage from "../utility/NetworkedPage";
import {Redirect} from "react-router-dom";
import ButtonOrWait from "../Component/ButtonOrWait";

const now = 60;

class Question extends NetworkedPage {

    constructor() {
        super();
        this.SubmitQuestion = this.SubmitQuestion.bind(this);
        this.answer = null;
    }

    componentDidMount() {
        this.ConnectToWebsocket(
            this.props.location.state.url,
            this.props.location.state.id,
            this.props.location.state.name
        );
    }

    SubmitQuestion() {
        this.socket.send("ANSWER " + this.answer);
        this.setState({});
    }

    render() {
        if (this.state.redirect) {
            console.log("Transition to Match");
            return (
                <Redirect to={{
                    pathname: "/questionmatch",
                    state: {
                        id: this.state.id,
                        roomCode: this.state.roomCode,
                        name: this.state.name,
                        url: this.url,
                    }
                }} />
            )
        } else {
            return (
                <div className="question">
                    <header className="App-header">
                        <div className="prompt">

                            <ProgressBar now={now} label={`${now} secs left!`}/>
                            <br/>

                            <h1>QUESTION</h1>

                            <Card border="primary" bg="light" text="dark">
                                <Card.Body>{this.props.location.state.question}</Card.Body>
                            </Card>

                            <Form.Group>
                                <br/>
                                <Form.Control as="text">
                                    {/*TODO add text box and listener, send question w/ WS*/}
                                    <input type="text" placeholder="Type your answer here!" onChange={this.handleNameChange}/>
                                </Form.Control>
                                <br/>
                                <ButtonOrWait answer={this.answer} SubmitQuestion={this.SubmitQuestion}/>
                            </Form.Group>
                        </div>
                    </header>
                </div>
            );
        }
    }

}

export default Question;

