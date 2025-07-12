import { useNavigate } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { toast } from "react-hot-toast";
import { getCookie, setCookie } from "../../utils/cookieHelper";
import styles from "./Home.module.css";
import loginIcon from "./login.png";
import chevronLeft from "./chevron_left.png";
import knowMore from "./know_more.png";
import chevronRight from "./chevron_right.png";

function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const scrollContainerRef = useRef(null);
  const weatherSectionRef = useRef(null);
  const schemesSectionRef = useRef(null);
  const { user } = useSelector((state) => state.auth);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [location, setLocation] = useState("New Delhi");
  const [inputLocation, setInputLocation] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);

  const API_KEY = "51d83528fa812a561d0a4071b365dcf8";
const API_BASE_URL = `${import.meta.env.VITE_SERVER}/api/v1`;

  const handleLoginClick = () => {
    navigate("/login");
  };

  const handleMarketGClick = () => {
    navigate("/general-market");
  };

  const handleAboutUsClick = () => {
    setShowAboutUs(!showAboutUs);
  };

  const handleInfoClick = () => {
    setShowInfo(!showInfo);
  };

  const handleCloseAboutUs = () => {
    setShowAboutUs(false);
  };

  const handleCloseInfo = () => {
    setShowInfo(false);
  };

  const handleWeatherClick = () => {
    weatherSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSchemesClick = () => {
    schemesSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const logoutHandler = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/user/logout`, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getCookie("chattu-token")}`,
        },
      });
      setCookie("chattu-token", "", -1); // Clear cookie
      dispatch({ type: "auth/userNotExists" }); // Dispatch logout action
      toast.success(data.message || "Logged out successfully");
      navigate("/login"); // Redirect to login
    } catch (error) {
      setCookie("chattu-token", "", -1); // Clear cookie even on error
      dispatch({ type: "auth/userNotExists" }); // Clear Redux state
      toast.error(error?.response?.data?.message || "Logout failed");
      navigate("/login"); // Redirect to login even on error
    }
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const scrollContainer = scrollContainerRef.current;

    if (distance > 50) {
      scrollContainer.scrollBy({ left: 300, behavior: "smooth" });
    } else if (distance < -50) {
      scrollContainer.scrollBy({ left: -300, behavior: "smooth" });
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  const scrollToNext = () => {
    scrollContainerRef.current.scrollBy({
      left: 300,
      behavior: "smooth",
    });
  };

  const scrollToPrev = () => {
    scrollContainerRef.current.scrollBy({
      left: -300,
      behavior: "smooth",
    });
  };

  const handleLocationSearch = () => {
    if (inputLocation.trim()) {
      setLocation(encodeURIComponent(inputLocation.trim()));
      setInputLocation("");
      setErrorMessage(null);
    }
  };

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoadingWeather(true);
        setErrorMessage(null);
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${location}&units=metric&appid=${API_KEY}`
        );
        const data = await response.json();
        if (response.ok && data.cod === 200) {
          setWeatherData(data);
        } else {
          if (data.cod === 401) {
            setErrorMessage(
              "Invalid API key. Please generate a new key at https://home.openweathermap.org/api_keys and update API_KEY."
            );
          } else if (data.cod === 429) {
            setErrorMessage(
              "API rate limit exceeded. Please wait 10 minutes and try again or upgrade your plan at https://openweathermap.org/price."
            );
          } else if (data.cod === 404) {
            setErrorMessage(
              `Location "${decodeURIComponent(
                location
              )}" not found. Please check the city name.`
            );
          } else {
            setErrorMessage(data.message || "Failed to load weather data.");
          }
          setWeatherData(null);
        }
      } catch (error) {
        console.error("Error fetching weather data:", error);
        setErrorMessage(
          "Network error. Please check your connection and try again."
        );
        setWeatherData(null);
      } finally {
        setLoadingWeather(false);
      }
    };

    fetchWeather();
  }, [location]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleWheel = (e) => {
      e.preventDefault();
      scrollContainer.scrollLeft += e.deltaY;
    };

    scrollContainer.addEventListener("wheel", handleWheel);
    scrollContainer.addEventListener("touchstart", handleTouchStart);
    scrollContainer.addEventListener("touchmove", handleTouchMove);
    scrollContainer.addEventListener("touchend", handleTouchEnd);

    return () => {
      scrollContainer.removeEventListener("wheel", handleWheel);
      scrollContainer.removeEventListener("touchstart", handleTouchStart);
      scrollContainer.removeEventListener("touchmove", handleTouchMove);
      scrollContainer.removeEventListener("touchend", handleTouchEnd);
    };
  }, [touchStart, touchEnd]);

  const getWeatherBackground = () => {
    if (!weatherData || !weatherData.weather || !weatherData.main) {
      return "linear-gradient(135deg, black 0%, #207cca 100%)";
    }
    const temp = weatherData.main.temp;
    const description = weatherData.weather[0].description.toLowerCase();

    if (description.includes("rain") || description.includes("drizzle")) {
      return "linear-gradient(135deg, #546e7a 0%, #78909c 100%)";
    } else if (temp >= 30) {
      return "linear-gradient(135deg, #ff6200 0%, #ff8c00 100%)";
    } else if (temp <= 10) {
      return "linear-gradient(135deg, #1976d2 0%, #4fc3f7 100%)";
    } else if (description.includes("clear") || description.includes("sunny")) {
      return "linear-gradient(135deg, #fbc02d 0%, #fff176 100%)";
    }
    return "linear-gradient(135deg, black 0%, #207cca 100%)";
  };

  return (
    <div className={styles.root}>
      <div className={styles.navbar}>
        <div className={styles.nav1}>
          <h4 className={styles.kisan}>Kisan Seva</h4>
        </div>
        <div className={styles.nav2}>
          <div onClick={handleMarketGClick}>
            <h5>Market</h5>
          </div>
          <div onClick={handleWeatherClick}>
            <h5>Weather</h5>
          </div>
          <div onClick={handleSchemesClick}>
            <h5>Schemes</h5>
          </div>
          <div onClick={() => navigate("/chat-home")}>
            <h5>Chat</h5>
          </div>
          <div onClick={handleAboutUsClick}>
            <h5>About Us</h5>
          </div>
          <div className={styles["button-family"]}>
            {!user ? (
              <button className={styles.btn1} onClick={handleLoginClick}>
                <img src={loginIcon} alt="Login icon" /> Login
              </button>
            ) : (
              <button className={styles.btn1} onClick={logoutHandler}>
                <img src={loginIcon} alt="Logout icon" /> Logout
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={styles["hero-section"]}>
        <div className={styles["hero-content"]}>
          <h2>Empowering Farmers with Secure Contract Farming</h2>
          <p>
            KisanSeva is a smart contract farming platform designed to connect
            farmers with buyers, ensuring transparent agreements, secure
            payments, and market stability. It features a Hindi voice assistant,
            machine learning-based insights, and secure payment integration via
            Razorpay, Paytm, and UPI.
          </p>
          <button className={styles.btn2} onClick={handleInfoClick}>
            {showInfo ? "Hide Info" : "Project Info"}
          </button>
        </div>
      </div>

      {showAboutUs && (
        <>
          <div
            className={styles["about-us-overlay"]}
            onClick={handleCloseAboutUs}
          />
          <div className={styles["about-us-section"]}>
            <button
              className={styles["close-button"]}
              onClick={handleCloseAboutUs}
            >
              ×
            </button>
            <h3>Meet the Team</h3>
            <div className={styles["team-members"]}>
              <div className={styles["team-member"]}>
                <h4>Aditya Gupta</h4>
                <p>
                  Aditya is a full-stack developer at KisanSeva, combining
                  technical precision with strategic insight to build robust and
                  scalable features across both frontend and backend.
                </p>
              </div>
              <div className={styles["team-member"]}>
                <h4>Vivek</h4>
                <p>
                  Vivek plays a vital role in full-stack development,
                  architecting backend APIs and crafting seamless frontend
                  experiences that power KisanSeva’s core functionality.
                </p>
              </div>
              <div className={styles["team-member"]}>
                <h4>Vaibhav Sharma</h4>
                <p>
                  Vaibhav Sharma contributes to both frontend and backend
                  development, blending visual design with powerful logic to
                  deliver a smooth and efficient user journey on KisanSeva.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {showInfo && (
        <>
          <div className={styles["info-overlay"]} onClick={handleCloseInfo} />
          <div className={styles["info-section"]}>
            <button
              className={styles["close-button"]}
              onClick={handleCloseInfo}
            >
              ×
            </button>
            <h3>Project Overview</h3>
            <div className={styles["info-content"]}>
              <h4>Objective</h4>
              <p>
                Our mission is to revolutionize agriculture through a digital
                platform that directly connects farmers with buyers using
                secure, predefined agreements. This innovative system tackles
                critical challenges in farming including price volatility,
                market barriers, and intermediary exploitation.
              </p>

              <h4>Key Features</h4>
              <ul>
                <li>
                  Legally binding contracts established before cultivation
                  begins
                </li>
                <li>Transparent pricing and transaction processes</li>
                <li>Guaranteed timely delivery of agricultural produce</li>
                <li>Income stabilization for farming communities</li>
                <li>Promotion of sustainable farming practices</li>
              </ul>

              <h4>Target Impact</h4>
              <p>The platform addresses significant socioeconomic needs by:</p>
              <ul>
                <li>Securing fair compensation for farmers</li>
                <li>Building confidence among agricultural buyers</li>
                <li>
                  Reducing exploitation through digital contract enforcement
                </li>
                <li>Supporting rural economic development</li>
              </ul>

              <h4>Innovative Approach</h4>
              <p>
                To overcome challenges like varying literacy levels and rural
                internet access, we've designed an intuitive interface with:
              </p>
              <ul>
                <li>Easy-to-use contract templates</li>
                <li>Comprehensive crop information</li>
                <li>Real-time weather and pricing updates</li>
                <li>Multilingual support including Hindi</li>
              </ul>

              <h4>Project Outcomes</h4>
              <p>Early results demonstrate:</p>
              <ul>
                <li>Increased farmer participation in digital markets</li>
                <li>Enhanced buyer trust in agricultural transactions</li>
                <li>Reduced contractual disputes through clear agreements</li>
                <li>Improved market access for small-scale farmers</li>
              </ul>

              <h4>Future Vision</h4>
              <p>
                This initiative represents a transformative approach to
                agricultural commerce, empowering farmers with digital tools,
                market information, and negotiation capabilities. The potential
                for large-scale impact includes revitalizing rural economies and
                establishing new standards for trust-based farming systems.
              </p>

              <div className={styles.keywords}>
                <span>Digital Agriculture</span>
                <span>Contract Farming</span>
                <span>Farmer Empowerment</span>
                <span>Rural Development</span>
                <span>Fair Trade</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Weather Section */}
      <div className={styles.weatherSection} ref={weatherSectionRef}>
        <div className={styles.weatherHeader}>
          <h2>Weather Forecast</h2>
          <div className={styles.box}></div>
        </div>

        {loadingWeather ? (
          <div className={styles.weatherLoading}>
            <div className={styles.loadingSpinner}></div>
            Loading weather data...
          </div>
        ) : errorMessage ? (
          <div className={styles.weatherError}>
            {errorMessage}
            {errorMessage.includes("rate limit") && (
              <button
                onClick={() => setLocation(location)}
                className={styles.retryButton}
              >
                Retry
              </button>
            )}
          </div>
        ) : weatherData && weatherData.cod === 200 ? (
          <div className={styles.weatherContainer}>
            <div
              className={styles.weatherCard}
              style={{ background: getWeatherBackground() }}
            >
              <div className={styles.weatherLocation}>
                <img
                  src={`https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`}
                  alt="Weather icon"
                  className={styles.weatherIcon}
                />
                <h3>
                  {weatherData.name}, {weatherData.sys?.country}
                </h3>
              </div>
              <div className={styles.weatherDetails}>
                <div className={styles.weatherMain}>
                  <span className={styles.weatherTemp}>
                    {Math.round(weatherData.main.temp)}°C
                  </span>
                  <span className={styles.weatherDesc}>
                    {weatherData.weather[0].description}
                  </span>
                </div>
                <div className={styles.weatherStats}>
                  <div className={styles.weatherStat}>
                    <span>Humidity</span>
                    <span>{weatherData.main.humidity}%</span>
                  </div>
                  <div className={styles.weatherStat}>
                    <span>Wind</span>
                    <span>{weatherData.wind.speed} m/s</span>
                  </div>
                  <div className={styles.weatherStat}>
                    <span>Feels Like</span>
                    <span>{Math.round(weatherData.main.feels_like)}°C</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.locationSearch}>
              <input
                type="text"
                value={inputLocation}
                onChange={(e) => setInputLocation(e.target.value)}
                placeholder="Enter location"
                onKeyPress={(e) => e.key === "Enter" && handleLocationSearch()}
              />
              <button onClick={handleLocationSearch}>Search</button>
            </div>
          </div>
        ) : (
          <div className={styles.weatherError}>
            Failed to load weather data. Please try again later.
          </div>
        )}
      </div>

      <div className={styles["main-section"]} ref={schemesSectionRef}>
        <div className={styles["main-section-top"]}>
          <div>
            <h2>Government Schemes</h2>
          </div>
          <div className={styles.box}></div>
        </div>

        <div className={styles.cardsContainer}>
          <button className={styles.arrowButton} onClick={scrollToPrev}>
            <img src={chevronLeft} alt="Previous" />
          </button>

          <div className={styles.cards} ref={scrollContainerRef}>
            {schemesData.map((scheme, index) => (
              <div key={index} className={styles.card}>
                <p className={styles.schemeTitle}>{scheme.title}</p>
                <p className={styles.schemeDescription}>{scheme.description}</p>
                <a
                  href={scheme.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.cardButton}
                >
                  Know more <img src={knowMore} alt="Know more" />
                </a>
              </div>
            ))}
          </div>

          <button className={styles.arrowButton} onClick={scrollToNext}>
            <img src={chevronRight} alt="Next" />
          </button>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Kisan Seva. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

const schemesData = [
  {
    title: "PM KISAN SAMMAN NIDHI",
    description:
      "Provides ₹6,000 annually in three installments to small and marginal farmers to support agricultural expenses.",
    link: "https://pmkisan.gov.in",
  },
  {
    title: "PM FASAL BIMA YOJANA",
    description:
      "Offers crop insurance to protect farmers against losses from natural calamities, pests, and diseases.",
    link: "https://pmfby.gov.in",
  },
  {
    title: "NATURAL FARMING MISSION",
    description:
      "Promotes sustainable practices using natural inputs to increase soil health and reduce environmental impact.",
    link: "https://naturalfarming.dac.gov.in/",
  },
  {
    title: "AGRICULTURAL MECHANIZATION",
    description:
      "Provides subsidies on farm equipment to boost productivity for small and marginal farmers.",
    link: "https://agrimachinery.nic.in",
  },
  {
    title: "RASHTRIYA KRISHI VIKAS",
    description:
      "Supports farmers with grants for advanced equipment and agricultural infrastructure development.",
    link: "https://agriwelfare.gov.in/en/RashtriyaDiv",
  },
  {
    title: "NAMO DRONE DIDI",
    description:
      "Provides drone subsidies to women SHGs for fertilizer and pesticide application services.",
    link: "https://www.pib.gov.in/PressNoteDetails.aspx?NoteId=153383&ModuleId=3",
  },
];

export default Home;
