import React, { Fragment, useEffect, useState, useRef } from "react";
import "./About.scss";
import { ImGithub } from "react-icons/im";
import { MdEmail } from "react-icons/md";
import { AiFillInstagram, AiFillFacebook, AiOutlineStar, AiOutlineFork } from "react-icons/ai";
import { FiShare2 } from "react-icons/fi";
import Api from "../../Config/API";
import Loader from "react-loader-spinner";
import Modal from 'react-modal';
import Styled from "styled-components";
import { ModalStyles } from "../../Utilities/Utility";
import ShareLinkBox from "../../Components/ShareLinkBox/ShareLinkBox";
import appConfig from "../../Config/app-config.json";
import {
    EmailShareButton,
    FacebookShareButton,
    HatenaShareButton,
    InstapaperShareButton,
    LineShareButton,
    LinkedinShareButton,
    LivejournalShareButton,
    MailruShareButton,
    OKShareButton,
    PinterestShareButton,
    PocketShareButton,
    RedditShareButton,
    TelegramShareButton,
    TumblrShareButton,
    TwitterShareButton,
    ViberShareButton,
    VKShareButton,
    WhatsappShareButton,
    WorkplaceShareButton,
    EmailIcon,
    FacebookIcon,
    HatenaIcon,
    InstapaperIcon,
    LineIcon,
    LinkedinIcon,
    LivejournalIcon,
    MailruIcon,
    OKIcon,
    PinterestIcon,
    PocketIcon,
    RedditIcon,
    TelegramIcon,
    TumblrIcon,
    TwitterIcon,
    ViberIcon,
    VKIcon,
    WhatsappIcon,
    WorkplaceIcon
} from "react-share";

const StyledAboutSection = Styled.div`
    .share-container{
        text-align: center;
        align-items: center;
            .share-btn{
                align-self: center;
                width: max-content;
            }
    }
`;

const About = (props) => {
    const _isMounted = useRef(true);
    const [isLoading, setLoading] = useState(false);
    const [isSocialsOpen, setSocialModal] = useState(false);
    const [githubInfo, setGithubInfo] = useState({
        starts: null,
        forks: null,
        repoUrl: ""
    });
    const { changeMainState } = props;
    const appShareUrl = appConfig.websiteUrl || "";
    const appShareTitle = "";
    const appShareDescription = ``;
    useEffect(() => {
        changeMainState("currentPage", "About");
    }, [changeMainState]);
    const contactList = Object.freeze([
        { type: "github", title: "Github", url: appConfig.githubUrl, icon: (<ImGithub style={{ fontSize: "30px" }} />), id: "github" },
        { type: "gmail", title: "Email", url: `mailto:${appConfig.emailAddress}`, icon: (<MdEmail style={{ fontSize: "35px" }} />), id: "gmail" },
        { type: "instagram", title: "Instagram", url: appConfig.instagramUrl, icon: (<AiFillInstagram style={{ fontSize: "35px" }} />), id: "instagram" },
        { type: "facebook", title: "Facebook", url: appConfig.facebookUrl, icon: (<AiFillFacebook style={{ fontSize: "35px" }} />), id: "facebook" }
    ]);

    const socialsList = Object.freeze([
        { type: "Facebook", SocialComponent: (props) => <FacebookShareButton {...props} />, Icon: (props) => <FacebookIcon  {...props} /> },
        { type: "Twitter", SocialComponent: (props) => <TwitterShareButton  {...props} />, Icon: (props) => <TwitterIcon  {...props} /> },
        { type: "Whatsapp", SocialComponent: (props) => <WhatsappShareButton  {...props} />, Icon: (props) => <WhatsappIcon  {...props} /> },
        { type: "InstaPaper", SocialComponent: (props) => <InstapaperShareButton  {...props} />, Icon: (props) => <InstapaperIcon  {...props} /> },
        { type: "Viber", SocialComponent: (props) => <ViberShareButton  {...props} />, Icon: (props) => <ViberIcon  {...props} /> },
        { type: "LinkedIn", SocialComponent: (props) => <LinkedinShareButton  {...props} />, Icon: (props) => <LinkedinIcon  {...props} /> },
        { type: "Hatena", SocialComponent: (props) => <HatenaShareButton  {...props} />, Icon: (props) => <HatenaIcon  {...props} /> },
        { type: "Tumblr", SocialComponent: (props) => <TumblrShareButton  {...props} />, Icon: (props) => <TumblrIcon  {...props} /> },
        { type: "Workplace", SocialComponent: (props) => <WorkplaceShareButton  {...props} />, Icon: (props) => <WorkplaceIcon  {...props} /> },
        { type: "Telegram", SocialComponent: (props) => <TelegramShareButton  {...props} />, Icon: (props) => <TelegramIcon  {...props} /> },
        { type: "Reddit", SocialComponent: (props) => <RedditShareButton  {...props} />, Icon: (props) => <RedditIcon  {...props} /> },
        { type: "Pinterest", SocialComponent: (props) => <PinterestShareButton  {...props} />, Icon: (props) => <PinterestIcon  {...props} /> },
        { type: "VK", SocialComponent: (props) => <VKShareButton  {...props} />, Icon: (props) => <VKIcon  {...props} /> },
        { type: "Mail ru", SocialComponent: (props) => <MailruShareButton  {...props} />, Icon: (props) => <MailruIcon  {...props} /> },
        { type: "Line", SocialComponent: (props) => <LineShareButton  {...props} />, Icon: (props) => <LineIcon  {...props} /> },
        { type: "Livejournal", SocialComponent: (props) => <LivejournalShareButton  {...props} />, Icon: (props) => <LivejournalIcon  {...props} /> },
        { type: "Pocket", SocialComponent: (props) => <PocketShareButton  {...props} />, Icon: (props) => <PocketIcon  {...props} /> },
        { type: "OK", SocialComponent: (props) => <OKShareButton  {...props} />, Icon: (props) => <OKIcon  {...props} /> },
        { type: "Email", SocialComponent: (props) => <EmailShareButton  {...props} />, Icon: (props) => <EmailIcon  {...props} /> },
    ]);
    useEffect(() => {
        if (process.env.NODE_ENV !== "production") {
            return;
        }
        setLoading(true);
        Api().get(appConfig.getMyRepoUrl).then(response => {
            if (_isMounted.current) {
                setLoading(false);
                const { stargazers_count = 100, forks_count = 100, html_url = appConfig.repoUrl } = response.data;
                if (response.data) {
                    setGithubInfo({
                        ...githubInfo,
                        starts: stargazers_count,
                        forks: forks_count,
                        repoUrl: html_url
                    })
                }
            }
        }).catch(err => {
            if (_isMounted.current) {
                setLoading(false);
                console.error(err);
            }
        });
        return () => {
            _isMounted.current = false;
        }
    }, []);

    return (
        <Fragment>
            <StyledAboutSection id="about--container" className="flex-column">
                {/* modal(s) */}
                {
                    socialsList?.length > 0 &&
                    <Modal ariaHideApp={false}
                        closeTimeoutMS={300}
                        id="shareAppModal"
                        isOpen={isSocialsOpen} onRequestClose={() => setSocialModal(false)}
                        style={{ ...ModalStyles, maxWidth: '400px' }}
                        contentLabel="Share the app">
                        <header className="flex-row">
                            <strong>Share</strong>
                            <strong className="close--modal" onClick={() => setSocialModal(false)}>&times;</strong>
                        </header>
                        <hr />
                        <div className="flex-row socials--container">
                            {
                                socialsList.map((el) => {
                                    const { SocialComponent, Icon, type } = el;
                                    return (
                                        <SocialComponent key={type} title={appShareTitle} quote={appShareDescription} body={appShareDescription} summary={appShareDescription} description={appShareDescription} url={appConfig.websiteUrl || ""}>
                                            <span title={type}><Icon size={42} round={true} /></span>
                                        </SocialComponent>
                                    )
                                })
                            }
                        </div>
                        <hr />
                        <footer>
                            <div>
                                <span>Link</span>
                                <ShareLinkBox link={appConfig.websiteUrl} />
                            </div>
                            <div className="mt-3">
                                <span>Alternative link </span>
                                <ShareLinkBox link={appConfig.alternativeWebsiteUrl} />
                            </div>

                        </footer>
                    </Modal>}
                    <div className="about--inner">
                        <div className="about-sub flex-column">
                            <div className="about-section-inner">
                                <h2 style={{ display: 'inline' }}>Contact us:</h2>  {}
                                <p className="team-name" style={{ display: 'inline', marginLeft: '10px' }}></p>  {}
                                <p></p>
                                <ul className="members-list">
                                    <li>Phạm Ngọc Đăng Khoa - 21110214</li>
                                    <li>Trần Khải Hoàn - 21110827</li>
                                    <li>Nguyễn Hồng Thông Điệp - 21110166</li>
                                    <li>Đoàn Thái Sơn - 21110289</li>
                                </ul>
                                <ul className="socials--links">
                                    {contactList.map(({ title, url, icon, id }, idx) => (
                                        <li key={id + idx} title={title}>
                                            <a href={url} target="_blank" rel="noopener noreferrer">
                                                {icon}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                </div>
            </StyledAboutSection>
        </Fragment>
    )
}
export default About;