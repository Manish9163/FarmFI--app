import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, TextInput, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Users, UserPlus, Star, MapPin, IndianRupee, Briefcase, CalendarClock, MessageCircle, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { WORKER_API } from '../config/api';

const { width } = Dimensions.get('window');

export default function WorkersScreen({ navigation }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('find'); // 'find' or 'my_workers'
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [myWorkers, setMyWorkers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [taskInput, setTaskInput] = useState('');

  // Fetch Database Data
  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      try {
        if (activeTab === 'find') {
          // Fetch open/available workers
          const res = await axios.get(WORKER_API);
          setAvailableWorkers(res.data);
        } else {
          // Fetch my active hired workers/jobs
          const token = user?.token;
          if (token) {
            const res = await axios.get(`${WORKER_API}/jobs`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMyWorkers(res.data);
          }
        }
      } catch (err) {
        console.log("Failed to fetch workers:", err);
      }
      setLoading(false);
    };

    fetchWorkers();
  }, [activeTab, user]);

  const handleHire = (worker) => {
    Alert.alert(
      "Confirm Hiring",
      `Hire ${worker.full_name} for ₹${worker.daily_rate}/day?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Hire Now", onPress: async () => {
             try {
                const token = user?.token;
                await axios.post(`${WORKER_API}/jobs`, {
                   worker_id: worker.id,
                   job_description: 'General Farm Duties',
                   expected_days: 1,
                   agreed_rate: worker.daily_rate
                }, { headers: { Authorization: `Bearer ${token}` } });
                
                Alert.alert("Worker Hired", `${worker.full_name} has been added to your crew!`);
                setAvailableWorkers(prev => prev.filter(w => w.id !== worker.id));
                setActiveTab('my_workers');
             } catch (e) {
                Alert.alert("Error", e.response?.data?.error || "Could not hire worker.");
             }
        }}
      ]
    );
  };

  const handleAssignTask = async () => {
    if (!taskInput.trim()) return;
    try {
        const token = user?.token;
        await axios.patch(`${WORKER_API}/jobs/${selectedWorker.id}/status`, {
            status: 'Ongoing',
            note: taskInput
        }, { headers: { Authorization: `Bearer ${token}` } });
        
        setMyWorkers(prev => prev.map(w => w.id === selectedWorker.id ? { ...w, job_description: taskInput } : w));
        setShowAssignModal(false);
        setTaskInput('');
        Alert.alert("Task Assigned", `Instructions securely beamed to ${selectedWorker.worker_name || selectedWorker.full_name}.`);
    } catch (e) {
        Alert.alert("Error", "Could not assign task.");
    }
  };

  const handlePayWage = async (worker) => {
    try {
        const token = user?.token;
        // Pushing job to completed implicitly releases the worker and records payment
        await axios.patch(`${WORKER_API}/jobs/${worker.id}/status`, {
            status: 'Completed',
            note: 'Wage successfully transferred via FarmFi API'
        }, { headers: { Authorization: `Bearer ${token}` } });
        
        setMyWorkers(prev => prev.filter(w => w.id !== worker.id));
        Alert.alert("Wage Cleared", `₹${worker.agreed_rate} successfully transferred to ${worker.worker_name || 'Worker'}!`);
    } catch (e) {}
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#fafafa" />
        </TouchableOpacity>
        <Text style={styles.title}>Gig Worker Platform</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Modern Top Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'find' && styles.activeTabBtn]} onPress={() => setActiveTab('find')}>
           <UserPlus size={18} color={activeTab === 'find' ? '#fff' : '#64748b'} />
           <Text style={[styles.tabText, activeTab === 'find' && styles.activeTabText]}>Find Labour</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'my_workers' && styles.activeTabBtn]} onPress={() => setActiveTab('my_workers')}>
           <Users size={18} color={activeTab === 'my_workers' ? '#fff' : '#64748b'} />
           <Text style={[styles.tabText, activeTab === 'my_workers' && styles.activeTabText]}>My Crew ({myWorkers.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {loading ? (
             <View style={{padding: 40, alignItems: 'center'}}>
                 <ActivityIndicator size="large" color="#ec4899" />
             </View>
        ) : activeTab === 'find' ? (
           <>
             {availableWorkers.length === 0 ? (
               <View style={styles.emptyState}>
                 <Text style={{color: '#94a3b8'}}>No more workers available in your radius today.</Text>
               </View>
             ) : (
               availableWorkers.map((worker, index) => (
                 <LinearGradient key={worker.id || index.toString()} colors={['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']} style={styles.workerCard}>
                    <View style={styles.workerTop}>
                        <View style={styles.avatar}>
                            <Text style={{color: '#ec4899', fontSize: 20, fontWeight: '800'}}>{worker.full_name?.charAt(0)}</Text>
                        </View>
                        <View style={{flex: 1}}>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                               <Text style={styles.workerName}>{worker.full_name}</Text>
                               <View style={styles.ratingBadge}>
                                  <Star size={12} color="#f59e0b" fill="#f59e0b" />
                                  <Text style={styles.ratingText}>{worker.rating || 4.5}</Text>
                               </View>
                            </View>
                            <Text style={styles.workerRole}>{worker.skills}</Text>
                        </View>
                    </View>

                    <View style={styles.workerStats}>
                       <View style={styles.statBox}>
                          <MapPin size={14} color="#64748b" />
                          <Text style={styles.statText}>{worker.location || 'Local'}</Text>
                       </View>
                       <View style={styles.statBox}>
                          <Briefcase size={14} color="#64748b" />
                          <Text style={styles.statText}>Verified</Text>
                       </View>
                       <View style={styles.statBox}>
                          <IndianRupee size={14} color="#10b981" />
                          <Text style={[styles.statText, {color: '#10b981', fontWeight: '700'}]}>{worker.daily_rate}/day</Text>
                       </View>
                    </View>

                    <TouchableOpacity style={styles.hireBtn} onPress={() => handleHire(worker)}>
                       <UserPlus size={18} color="#09090b" style={{marginRight: 6}} />
                       <Text style={styles.hireBtnText}>Hire for ₹{worker.daily_rate}/day</Text>
                    </TouchableOpacity>
                 </LinearGradient>
               ))
             )}
           </>
        ) : (
           <>
             {myWorkers.length === 0 ? (
               <View style={styles.emptyState}>
                 <Text style={{color: '#94a3b8'}}>Your active worker roster is empty.</Text>
               </View>
             ) : (
               myWorkers.map((worker, index) => (
                 <View key={worker.id || index.toString()} style={styles.activeWorkerCard}>
                    <View style={styles.workerTop}>
                        <View style={[styles.avatar, {backgroundColor: 'rgba(16, 185, 129, 0.1)'}]}>
                            <Text style={{color: '#10b981', fontSize: 20, fontWeight: '800'}}>{(worker.worker_name || 'W').charAt(0)}</Text>
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={styles.workerName}>{worker.worker_name}</Text>
                            <Text style={styles.workerRole}>{worker.status}</Text>
                        </View>
                        <TouchableOpacity style={styles.iconBtn}>
                           <MessageCircle size={20} color="#3b82f6" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.taskContainer}>
                       <Text style={styles.taskLabel}>CURRENTLY ASSIGNED TO:</Text>
                       <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                          <CalendarClock size={16} color={worker.job_description === 'Idle' ? '#f59e0b' : '#8b5cf6'} style={{marginRight: 8}} />
                          <Text style={[styles.taskText, worker.job_description === 'Idle' && {color: '#f59e0b', fontWeight: '700'}]}>
                             {worker.job_description || 'General Labour'}
                          </Text>
                       </View>
                    </View>

                    <View style={styles.activeActionRow}>
                       <TouchableOpacity style={styles.assignBtn} onPress={() => { setSelectedWorker(worker); setShowAssignModal(true); }}>
                          <Text style={styles.assignBtnText}>Assign Task</Text>
                       </TouchableOpacity>
                       <TouchableOpacity style={styles.payBtn} onPress={() => handlePayWage(worker)}>
                          <IndianRupee size={14} color="#fff" style={{marginRight: 4}} />
                          <Text style={styles.payBtnText}>Pay ₹{worker.agreed_rate}</Text>
                       </TouchableOpacity>
                    </View>
                 </View>
               ))
             )}
           </>
        )}
      </ScrollView>

      {/* Task Assignment Modal */}
      <Modal visible={showAssignModal} transparent animationType="slide">
         <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
               <Text style={styles.modalTitle}>Assign Task</Text>
               <Text style={styles.modalSub}>Sending instruction directly to {selectedWorker?.name}</Text>
               
               <TextInput 
                 style={styles.taskInput}
                 placeholder="e.g. Go to Sector B and complete pruning before sunset."
                 placeholderTextColor="#64748b"
                 multiline
                 value={taskInput}
                 onChangeText={setTaskInput}
               />
               
               <View style={{flexDirection: 'row', gap: 12}}>
                  <TouchableOpacity style={[styles.modalBtn, {backgroundColor: 'transparent', borderWidth: 1, borderColor: '#3f3f46'}]} onPress={() => { setShowAssignModal(false); setTaskInput(''); }}>
                     <Text style={{color: '#fff', fontWeight: '600'}}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#8b5cf6'}]} onPress={handleAssignTask}>
                     <CheckCircle2 size={18} color="#fff" style={{marginRight: 6}} />
                     <Text style={{color: '#fff', fontWeight: '700'}}>Transmit Order</Text>
                  </TouchableOpacity>
               </View>
            </View>
         </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  content: { padding: 20, paddingBottom: 60 },

  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 16, marginBottom: 8, gap: 12 },
  tabBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#27272a' },
  activeTabBtn: { backgroundColor: '#ec4899', borderColor: '#ec4899' },
  tabText: { color: '#64748b', fontWeight: '600', marginLeft: 8 },
  activeTabText: { color: '#fff', fontWeight: '800' },

  workerCard: { padding: 20, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  workerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(236, 72, 153, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  workerName: { color: '#f8fafc', fontSize: 17, fontWeight: '700', marginBottom: 2 },
  workerRole: { color: '#94a3b8', fontSize: 13 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ratingText: { color: '#f59e0b', fontSize: 12, fontWeight: '700', marginLeft: 4 },

  workerStats: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#18181b', padding: 12, borderRadius: 12, marginBottom: 16 },
  statBox: { flexDirection: 'row', alignItems: 'center' },
  statText: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginLeft: 6 },

  hireBtn: { backgroundColor: '#ec4899', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12 },
  hireBtnText: { color: '#09090b', fontSize: 15, fontWeight: '800' },

  activeWorkerCard: { backgroundColor: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center' },
  taskContainer: { backgroundColor: '#18181b', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#27272a' },
  taskLabel: { color: '#64748b', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  taskText: { color: '#fff', fontSize: 15, fontWeight: '500', lineHeight: 22 },

  activeActionRow: { flexDirection: 'row', gap: 12 },
  assignBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#3f3f46' },
  assignBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  payBtn: { flex: 1, backgroundColor: '#10b981', flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  payBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181b', borderRadius: 20, borderWidth: 1, borderColor: '#27272a' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#18181b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  modalSub: { color: '#94a3b8', fontSize: 14, marginBottom: 20 },
  taskInput: { borderLeftWidth: 2, borderLeftColor: '#8b5cf6', backgroundColor: '#09090b', height: 100, color: '#fff', padding: 16, paddingVertical: 16, fontSize: 15, borderRadius: 8, marginBottom: 24, textAlignVertical: 'top' },
  modalBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 50, borderRadius: 12 }
});
