import React from 'react';
import * as Notifications from 'expo-notifications';
import SoundPlayer from 'react-native-sound-player';
import AppButton from '../components/Button';
import { View, AsyncStorage, Text, StyleSheet, Clipboard, LogBox, ScrollView } from 'react-native';

//expo push:android:upload --api-key AAAAESHut6U:APA91bEsZhDfm-b8GfZMVGXbkn_diHmwjim7tZH4riFMBwJQftx5JAspq5gL4yI7cfXY5G5rcAOHmhzCD8GKlWGaBF7RGuVH_ienZm8u3JUR4QD5icoZcpJlxnFXN8kIM2zdbnD0xLpj
//keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
//Password
//sami92
//CN=Sami Akram, OU=92news, O=92news, L=Lahore, ST=Punjab, C=pk

LogBox.ignoreLogs(['Warning: ...']);
LogBox.ignoreAllLogs();


Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
    }),
});


let rnStorage = {
    save: async (key, value) => {
        try {
            await AsyncStorage.setItem(key, value);
        } catch (eor1) {
            // Error saving data
        }
    },
    get: async (key) => {
        try {
            const value = await AsyncStorage.getItem(key);
            return value;
        } catch (eor2) {
            // Error retrieving data
        }
    }
}


export default class AppNavigator extends React.Component {
    notificationListener = {}
    responseListener = {};
    mounted = 0;
    baseUrl = 'https://dap.92newshd.tv';
    constructor() {
        super();
        this.state = {
            expoToken: '',
            error_message: '',
            warning: '',
            tokenSent: 0,
            servers_list: [],
            subscriptions: [],
            bg_log: 'No bg worker yet',
            copyBtnLabel: 'Copy token',
        };
    }

    run_bg_process() {
    }
    copyToken() {
        let obj_this = this;
        Clipboard.setString(obj_this.state.expoToken);
        obj_this.setState({ copyBtnLabel: 'Copied' });
    };

    st_upd = 0;

    setState(values) {
        let obj_this = this;
        if (!this.mounted) {
            for (let key in values) {
                this.state[key] = values[key];
            }
            return;
        }
        obj_this.st_upd += 1;
        super.setState(values);
    }

    on_error(oner, prefix) {
        console.log('\nError function => ' + prefix);
        this.setState({ error_message: prefix });
    }

    on_warning(txt) {
        this.setState({ warning: txt });
    }

    componentDidMount() {
        let obj_this = this;

        // This listener is fired whenever a notification is received while the app is foregrounded
        obj_this.notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('\nNotification Body', notification.body);
            //obj_this.playSound();
        });

        // This listener is fired whenever a user taps on or interacts with a notification
        // (works when app is foregrounded, backgrounded, or killed)
        obj_this.responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            let category_id = response.notification.request.content.categoryIdentifier;
            //console.log('\nNotification here' + category_id);
        });

        obj_this.mounted = 1;
        this.get_server_list();

        try {
            this.registerForPushNotificationsAsync().then(pushToken => {
                if (!pushToken) {
                    let message = 'Invalid Token';
                    obj_this.on_error(0, message);
                }
                else {
                    obj_this.setState({ expoToken: pushToken });
                    obj_this.submit_token(pushToken);
                }
            }).catch(er6 => {
                let message = ('Could not registerPushNotificationsAsync-1');
                obj_this.on_error(er6, message);
            });
        }
        catch (er7) {
            let message = ('Could not registerPushNotificationsAsync-2');
            obj_this.on_error(er7, message);
        }

        // Unsubscribe from events
        return () => {
            Notifications.removeNotificationSubscription(obj_this.notificationListener.current);
            Notifications.removeNotificationSubscription(obj_this.responseListener.current);
        };
    }

    async get_server_list() {
        let endpoint = this.baseUrl + '/servers/list';
        try {
            let resp = await fetch(endpoint);
            let json = await resp.json();
            this.setState({ servers_list: json.list });
        }
        catch (er2) {
            this.on_error(0, ' Error in ' + endpoint + ' => ' + er2);
            return [];
        }
    }

    playSound() {
        SoundPlayer.playSoundFile('beep', 'mp3');
    }

    async sendNotification() {

        let endpoint = '/messages/send';
        try {
            let resp = await fetch(this.baseUrl + endpoint);
            let json = await resp.json();
            console.log('\nSend Message', json);
        }
        catch (er3) {
            console.log('\nError in send get =>', er3);
        }
    }

    async toggleNotification(alert_id) {
        let obj_this = this;
        try {
            let item = obj_this.state.subscriptions.find((x) => x.channel__name == alert_id);
            item.active = !item.active;
            let endpoint = '/expo/toggle/' + alert_id + '/' + obj_this.state.expoToken;
            let resp = await fetch(this.baseUrl + endpoint);
            let json = await resp.json();
            if (json.status == 'success') {

                obj_this.setState({ subscriptions: obj_this.state.subscriptions });
            }
        }
        catch (er4) {
            let message = ('Error in toggle => ' + er4);
            obj_this.on_error(er4, message);
        }
    }

    async submit_token(obtained_token) {
        console.log('\nSubmitting Token => ' + obtained_token);
        let my_token = await rnStorage.get('token');
        if (!obtained_token) {
            alert('No token provided');
            return;
        }
        let obj_this = this;
        let data = { obtained_token: obtained_token };
        let endpoint = '/expo/submit/' + obtained_token;
        if (my_token) {
            endpoint = '/expo/channels/' + obtained_token;
        }
        endpoint = this.baseUrl + endpoint;
        let postOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        };
        fetch(endpoint).then((response) => {
            if (!response.ok) {
                console.log('\nError in submit => ' + endpoint);
                return { status: 'error', message: 'Invalid response => ' + response.status + ' from ' + endpoint };
            }
            else {
                return response.json();
            }
        }).then((json_data) => {
            if (json_data.status == 'success') {
                if (json_data.status == 'success') {
                    rnStorage.save('token', obtained_token).then(() => { });
                    if (!json_data.channels.length) {
                        obj_this.on_warning('No active channels found');
                    }
                    else {
                        obj_this.setState({ subscriptions: json_data.channels });
                    }
                }
                else {
                    obj_this.on_error(0, json_data.message);
                }
            }
            else {
                obj_this.on_error(0, json_data.message || 'Invalid Response from submit');
            }
        }).catch((er5) => {
            console.log('\nIn submit ' + endpoint + '\n')
            let message = ('Error in submit token => ' + '' + er5);
            obj_this.on_error(er5, message);
        });
    }

    async registerForPushNotificationsAsync() {
        let token;
        try {

            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                alert('Failed to get push token for push notification!');
                return;
            }
            token = (await Notifications.getExpoPushTokenAsync()).data;
            console.log('\n\tPlatForm => ' + Platform.OS);
            if (Platform.OS === 'android') {
                Notifications.setNotificationChannelAsync('down_alerts', {
                    name: 'main',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }
        }
        catch (ex) {
            console.log('\nError in device ', er)
        }
        if (!token) {
            console.log('\nNo expo token for device');
        }
        return token;
    }

    async check_servers() {
        let obj_this = this;
        let res_list = obj_this.state.servers_list;
        let endpoint = this.baseUrl + '/servers/check-only';
        try {
            let resp = await fetch(endpoint);
            let json = await resp.json();
            console.log('\nCheck only', res_list);
            for(let item of json.data.servers){
                let matched = res_list.find(x => x.check_path == item.check_path);
                if(matched)
                {
                    matched.status = item.status;
                }
            }
            this.setState({ servers_list: res_list });
        }
        catch (er2) {
            this.on_error(0, ' Error in ' + endpoint + ' => ' + er2);
            return [];
        }
    }

    check_servers_client() {
        console.log('\nBefore check', Date());
        let obj_this = this;
        let promises = [];
        let res_list = obj_this.state.servers_list;
        console.log('\nList', res_list);
        for (let item of res_list) {
            promises.push(fetch(item.check_path).then((resp) => { return { url: item.check_path, status: resp.status } }));
        }
        console.log('Chanined');
        Promise.all(promises).then((values) => {
            console.log('\n\nObtained list', values);
            for (let item of values) {
                res_list.find(x => x.check_path == item.url).status = item.status;
            }
            obj_this.setState({ servers_list: res_list });
            console.log('\After check', Date());
            //console.log('\nServer List', values);
        }).catch(er => {
            obj_this.on_error(0, '' + er);
        });
    }

    render() {
        let obj_this = this;

        if (obj_this.state.error_message) {
            return (
                <View style={styles.container}>
                    <Text>{obj_this.state.error_message}</Text>
                </View>
            );
        }

        function server_status_list(items_list) {
            function get_item_style(status, item_url) {
                if (!status) {
                    console.log('\nNo status for ' + item_url);
                    status = 'Unreachable';
                }
                if (status == 200) {
                    status = 'OK';
                }
                status = '' + status;
                if (status == 'OK') {
                    return [styles.list_item, styles.green_item];
                }
                else {
                    return [styles.list_item, styles.red_item];
                }
            }

            return (
                <View>
                    <Text style={styles.heading2}>
                        Servers Status List
                    </Text>
                    <ScrollView>
                        {
                            items_list.map(function (item, j) {
                                return (
                                    <View style={get_item_style(item.status)} key={j}>
                                        <Text>{item.name}</Text>
                                        <Text>{item.status}</Text>
                                    </View>
                                )
                            })
                        }
                    </ScrollView>
                </View>
            )
        }

        function render_alerts(items_list, name) {
            return (
                <View>
                    <View>
                        <Text>{name}</Text>
                    </View>
                    <View>
                        {
                            items_list.map(function (item, j) {
                                let title = "Subscribe => " + item.channel__name + ' Status';
                                if (item.active) {
                                    title = "Unsubscribe => " + item.channel__name + ' Status';
                                }
                                return (
                                    <View key={j}>
                                        <AppButton
                                            title={title}
                                            onPress={() => {
                                                obj_this.toggleNotification(item.channel__name);
                                            }}
                                        />
                                    </View>
                                )
                            })
                        }
                    </View>
                </View>
            );
        }

        function show_warning() {
            if (obj_this.state.warning) {
                return (
                    <View>
                        <Text>{obj_this.state.warning}</Text>
                    </View>
                );
            }
        }

        // <AppButton onPress={() => { obj_this.run_bg_process() }} title="Start Bg Worker" />
        // <Text>{obj_this.state.bg_log}</Text>

        return (
            <View style={styles.container}>
                {show_warning()}
                {server_status_list(obj_this.state.servers_list)}
                <AppButton onPress={() => { obj_this.check_servers() }} title="Check Servers Now" />
                <Text selectable={true}>Token == {obj_this.state.expoToken || 'Obtaining token'}</Text>
                <AppButton onPress={() => { obj_this.copyToken() }} title={obj_this.state.copyBtnLabel} />
                {render_alerts(obj_this.state.subscriptions, 'My Alerts')}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        marginTop: 30,
        padding: 10
    },
    list_item: {
        marginVertical: 5,
        borderWidth: 2,
        padding: 5,
        flex: 1,
        borderRadius: 5,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    red_item: {
        borderWidth: 4,
        borderColor: 'red',
    },
    green_item: {
        borderColor: 'green',
    },
    heading2: {
        fontWeight: 'bold',
        fontSize: 16,
        paddingTop: 10,
        paddingBottom: 5,
    }
});
