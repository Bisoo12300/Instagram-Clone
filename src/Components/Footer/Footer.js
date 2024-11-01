import React, { Fragment } from "react";
import "../../Pages/Home/Home.css";
import { IoIosArrowDown } from "react-icons/io";
import { BsHeartFill } from "react-icons/bs";
import { Link } from "react-router-dom";

const Footer = () => (
    <Fragment>
        <footer id="main--footer">
            <div id="userProfFooter" className="userProfile--footer auth--footer--container desktop-only">
                            <ul className="auth--footer--ul flex-row">
                                    <li><Link to="/about">ABOUT</Link></li>
                                    <li>HELP</li>
                                    <li>PRESS</li>
                                    <li>API</li>
                                    <li>JOBS</li>
                                    <li>PRIVACY</li>
                                    <li>TERMS</li>
                                    <li>LOCATIONS</li>
                                    <li>TOP ACCOUNTS</li>
                                    <li>HASHTAGS</li>
                                    <li>LANGUAGE</li>
                                </ul>
                                <div className="auth--copyright flex-column">
                                    <span>This app was made for personal use</span>
                                </div>
            </div>    
        </footer>
       
    </Fragment>
)

export default Footer;