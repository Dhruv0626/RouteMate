import React, { createContext, useContext, useState, useEffect } from "react";

// Safe DOM patches to prevent translation tools
// from crashing React with "NotFoundError: Failed to execute 'insertBefore' on 'Node'"
if (typeof window !== "undefined") {
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return originalInsertBefore.call(this, newNode, null);
    }
    return originalInsertBefore.apply(this, arguments);
  };

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child && child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  const originalReplaceChild = Node.prototype.replaceChild;
  Node.prototype.replaceChild = function (newChild, oldChild) {
    if (oldChild && oldChild.parentNode !== this) {
      return newChild;
    }
    return originalReplaceChild.apply(this, arguments);
  };
}

const LanguageContext = createContext();

const translations = {
  en: {
    settings: "Settings",
    preferences: "Preferences & Configurations",
    appearance: "Appearance",
    darkMode: "Dark Mode",
    toggleTheme: "Toggle app visual theme",
    notifications: "Notifications",
    pushNotifications: "Push Notifications",
    pushDesc: "Receive updates on rides and promotions",
    emailAlerts: "Email Alerts",
    emailDesc: "Crucial trip alerts and OTP verification",
    privacySettings: "Privacy & Settings",
    locationServices: "Location Services",
    locationDesc: "Allow RouteMate to access your live location",
    language: "Language",
    helpSupport: "Help & Support",
    helpDesc: "Contact us, FAQ, and resources",
    signOut: "Sign Out",
    deleteAccount: "Delete Account",
    deleting: "Deleting...",
    welcomeBack: "Welcome Back",
    quickActions: "Quick Actions",
    bookRide: "Book a Ride",
    findBook: "Find & Book",
    manageRides: "Manage Rides",
    earnings: "Earnings",
    recentActivity: "Recent Activity",
    searchRides: "Search Rides",
    viewAll: "View All",
    success: "Success",
    pending: "Pending",
    cancelled: "Cancelled",
    completed: "Completed"
  },
  hi: {
    settings: "सेटिंग्स",
    preferences: "प्राथमिकताएं और विन्यास",
    appearance: "दिखावट",
    darkMode: "डार्क मोड",
    toggleTheme: "ऐप विजुअल थीम टॉगल करें",
    notifications: "सूचनाएं",
    pushNotifications: "पुश नोटिफिकेशन",
    pushDesc: "सवारी और प्रचार पर अपडेट प्राप्त करें",
    emailAlerts: "ईमेल अलर्ट",
    emailDesc: "महत्वपूर्ण यात्रा अलर्ट और ओटीपी सत्यापन",
    privacySettings: "गोपनीयता और सेटिंग्स",
    locationServices: "स्थान सेवाएं",
    locationDesc: "रूटमेट को अपने लाइव स्थान तक पहुंचने की अनुमति दें",
    language: "भाषा",
    helpSupport: "सहायता और समर्थन",
    helpDesc: "हमसे संपर्क करें, अक्सर पूछे जाने वाले प्रश्न और संसाधन",
    signOut: "साइन आउट",
    deleteAccount: "खाता हटाएं",
    deleting: "हटाया जा रहा है...",
    welcomeBack: "आपका स्वागत है",
    quickActions: "त्वरित कार्रवाई",
    bookRide: "सवारी बुक करें",
    findBook: "खोजें और बुक करें",
    manageRides: "सवारी प्रबंधित करें",
    earnings: "कमाई",
    recentActivity: "हाल की गतिविधि",
    searchRides: "सवारी खोजें",
    viewAll: "सभी देखें",
    success: "सफल",
    pending: "लंबित",
    cancelled: "रद्द किया गया",
    completed: "पूरा किया गया"
  },
  gu: {
    settings: "સેટિંગ્સ",
    preferences: "પસંદગીઓ અને રૂપરેખાંકનો",
    appearance: "દેખાવ",
    darkMode: "ડાર્ક મોડ",
    toggleTheme: "એપ્લિકેશન વિઝ્યુઅલ થીમ ટૉગલ કરો",
    notifications: "સૂચનાઓ",
    pushNotifications: "પુશ સૂચનાઓ",
    pushDesc: "સવારી અને પ્રમોશન પર અપડેટ્સ મેળવો",
    emailAlerts: "ઈમેલ ચેતવણીઓ",
    emailDesc: "મહત્વપૂર્ણ ટ્રીપ ચેતવણીઓ અને ઓટીપી વેરિફિકેશન",
    privacySettings: "ગોપનીયતા અને સેટિંગ્સ",
    locationServices: "સ્થાન સેવાઓ",
    locationDesc: "રૂટમેટને તમારા લાઇવ લોકેશનને ઍક્સેસ કરવાની મંજૂરી આપો",
    language: "ભાષા",
    helpSupport: "મદદ અને સપોર્ટ",
    helpDesc: "અમારો સંપર્ક કરો, FAQ અને સંસાધનો",
    signOut: "સાઇન આઉટ",
    deleteAccount: "એકાઉન્ટ કાઢી નાખો",
    deleting: "કાઢી નાખવામાં આવી રહ્યું છે...",
    welcomeBack: "આપનું સ્વાગત છે",
    quickActions: "ઝડપી ક્રિયાઓ",
    bookRide: "સવારી બુક કરો",
    findBook: "શોધો અને બુક કરો",
    manageRides: "સવારી મેનેજ કરો",
    earnings: "કમાણી",
    recentActivity: "તાજેતરની પ્રવૃત્તિ",
    searchRides: "સવારી શોધો",
    viewAll: "બધા જુઓ",
    success: "સફળ",
    pending: "બાકી",
    cancelled: "રદ કરેલ",
    completed: "પૂર્ણ"
  }
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem("appLanguage") || "en";
  });

  // Set translation class on html tag when language changes
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("lang-en", "lang-hi", "lang-gu");
    root.classList.add(`lang-${currentLanguage}`);
  }, [currentLanguage]);

  // Programmatically trigger Google Translate combo change event
  const triggerGoogleTranslateCombo = (lang) => {
    const selectEl = document.querySelector(".goog-te-combo");
    if (selectEl) {
      selectEl.value = lang;
      selectEl.dispatchEvent(new Event("change"));
    }
  };

  // Keep checking for the google translate combo on load to ensure it translates correctly
  useEffect(() => {
    if (currentLanguage !== "en") {
      const interval = setInterval(() => {
        const selectEl = document.querySelector(".goog-te-combo");
        if (selectEl) {
          triggerGoogleTranslateCombo(currentLanguage);
          clearInterval(interval);
        }
      }, 100);
      setTimeout(() => clearInterval(interval), 10000); // 10s maximum wait
    }
  }, [currentLanguage]);

  const setLanguage = (lang) => {
    if (translations[lang]) {
      setCurrentLanguage(lang);
      localStorage.setItem("appLanguage", lang);

      // Set cookie for Google Translate
      const cookieVal = lang === "en" ? "" : `/en/${lang}`;
      document.cookie = `googtrans=${cookieVal}; path=/;`;
      document.cookie = `googtrans=${cookieVal}; path=/; domain=${window.location.hostname};`;
      if (window.location.hostname.includes(".")) {
        document.cookie = `googtrans=${cookieVal}; path=/; domain=.${window.location.hostname};`;
      }

      // Trigger translate in DOM
      triggerGoogleTranslateCombo(lang);
    }
  };

  const t = (key) => {
    return translations[currentLanguage]?.[key] || translations["en"]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
