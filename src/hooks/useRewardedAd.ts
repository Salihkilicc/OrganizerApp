import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
    RewardedAd,
    RewardedAdEventType,
    TestIds,
} from 'react-native-google-mobile-ads';

// Test ad unit IDs (replace with real IDs in production)
const adUnitId = __DEV__
    ? TestIds.REWARDED
    : Platform.select({
        ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY', // Replace with your iOS ad unit ID
        android: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY', // Replace with your Android ad unit ID
    }) ?? TestIds.REWARDED;

export function useRewardedAd() {
    const [rewarded, setRewarded] = useState<RewardedAd | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const ad = RewardedAd.createForAdRequest(adUnitId, {
            requestNonPersonalizedAdsOnly: false,
        });

        const loadedListener = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
            setLoaded(true);
            setLoading(false);
            console.log('[useRewardedAd] Ad loaded');
        });

        const earnedListener = ad.addAdEventListener(
            RewardedAdEventType.EARNED_REWARD,
            (reward) => {
                console.log('[useRewardedAd] User earned reward:', reward);
            }
        );

        setRewarded(ad);

        return () => {
            loadedListener();
            earnedListener();
        };
    }, []);

    const loadAd = () => {
        if (!rewarded) {
            console.warn('[useRewardedAd] Ad instance not created yet');
            return;
        }
        if (loaded) {
            console.log('[useRewardedAd] Ad already loaded');
            return;
        }
        if (loading) {
            console.log('[useRewardedAd] Ad already loading');
            return;
        }

        console.log('[useRewardedAd] Loading ad...');
        setLoading(true);
        rewarded.load();
    };

    const showAd = async (): Promise<boolean> => {
        if (!rewarded || !loaded) {
            console.warn('[useRewardedAd] Ad not ready');
            return false;
        }

        return new Promise((resolve) => {
            const earnedListener = rewarded.addAdEventListener(
                RewardedAdEventType.EARNED_REWARD,
                () => {
                    console.log('[useRewardedAd] Reward earned!');
                    earnedListener();
                    resolve(true);
                }
            );

            rewarded.show().catch((error) => {
                console.error('[useRewardedAd] Error showing ad:', error);
                earnedListener();
                resolve(false);
            });

            // Reset loaded state after showing
            setLoaded(false);
            // Preload next ad
            setTimeout(() => loadAd(), 1000);
        });
    };

    return {
        loaded,
        loading,
        loadAd,
        showAd,
    };
}
